function logEvent (pc: RTCPeerConnection, eventName: string) {
    pc.addEventListener(eventName, console.debug.bind(null, `[RTCPeerConnection][${eventName}]:`))
}

function waitUntilIceGatheringComplete (pc: RTCPeerConnection): Promise<void> {
    if (pc.iceGatheringState === "complete") {
        return Promise.resolve()
    }
    return new Promise(res => {
        pc.addEventListener("icegatheringstatechange", function onStateChange () {
            if (pc.iceGatheringState === "complete") {
                res()
                pc.removeEventListener("icegatheringstatechange", onStateChange)
            }
        })
    })
}

async function main () {
    let offBtn = document.getElementById("btnCreateOffer") as HTMLButtonElement
    const ipt = document.getElementById("ipt") as HTMLTextAreaElement

    const pc = new RTCPeerConnection({
        iceServers: [
            { urls: "stun:stun.bluesip.net:3478" }
        ]
    })
    logEvent(pc, "connectionstatechange")
    logEvent(pc, "datachannel")
    logEvent(pc, "icecandidate")
    logEvent(pc, "icecandidateerror")
    logEvent(pc, "iceconnectionstatechange")
    logEvent(pc, "icegatheringstatechange")
    logEvent(pc, "negotiationneeded")
    logEvent(pc, "signalingstatechange")
    logEvent(pc, "track")
    window["pc"] = pc
    var dc: RTCDataChannel
    pc.addEventListener("datachannel", function ondatachannel (evt: RTCDataChannelEvent) {
        pc.removeEventListener("datachannel", ondatachannel)
        if (!dc) {
            dc = evt.channel
            dc.addEventListener("message", console.debug.bind(null, "[RTCDataChannel][message]:"))
            ipt.value = ""
        }
    })

    const store = { list: [] }

    const ws = new WebSocket(`ws://${location.hostname}:8080/signaling`)
    ws.addEventListener("message", async (evt: MessageEvent) => {
        const msg = JSON.parse(evt.data)
        console.log("ws.message: ", msg)
        switch (msg.Type) {
            case "list":
                console.log("getList: ", msg.Data.List)
                store.list = msg.Data.List
                break
            case "offer":
                offBtn.innerText = "send"

                await pc.setRemoteDescription(msg.Data.Data)
                const ans = await pc.createAnswer()
                await pc.setLocalDescription(ans)
                await waitUntilIceGatheringComplete(pc)
                ws.send(JSON.stringify({ Type: "answer", Data: { To: msg.Data.From, Data: pc.localDescription } }))
                break
            case "answer":
                offBtn.innerText = "send"
                await pc.setRemoteDescription(msg.Data.Data)
                ipt.value = ""
                break
            case "newClient":
                store.list = [msg.Data.Name]
                break
        }
    })
    window["ws"] = ws
    ws.addEventListener("open", () => {
        ws.send(JSON.stringify({ Type: "list" }))
    })



    offBtn.addEventListener("click", async () => {
        if (pc.connectionState === "new") {
            offBtn.innerText = "setAnswer"


            dc = pc.createDataChannel("testing")
            dc.addEventListener("message", console.debug.bind(null, "[RTCDataChannel][message]:"))
            const offer = await pc.createOffer()
            pc.setLocalDescription(offer)
            await waitUntilIceGatheringComplete(pc)
            ws.send(JSON.stringify({ Type: "offer", Data: { To: store.list[0], Data: pc.localDescription } }))
            ipt.value = JSON.stringify(pc.localDescription)
        } else {
            dc.send(ipt.value)
            ipt.value = ""
        }
    })

}

main()
