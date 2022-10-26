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
    let ansBtn = document.getElementById("btnCreateAnswer") as HTMLButtonElement
    const ipt = document.getElementById("ipt") as HTMLTextAreaElement

    const pc = new RTCPeerConnection()
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

    offBtn.addEventListener("click", async function(evt: MouseEvent) {
        if (ansBtn) {
            ansBtn.parentElement.removeChild(ansBtn)
            ansBtn = null
            offBtn.innerText = "setAnswer"


            dc = pc.createDataChannel("testing")
            dc.addEventListener("message", console.debug.bind(null, "[RTCDataChannel][message]:"))
            const offer = await pc.createOffer()
            pc.setLocalDescription(offer)
            await waitUntilIceGatheringComplete(pc)
            ipt.value = JSON.stringify(pc.localDescription)
        } else if (dc && dc.readyState == "connecting") {
            offBtn.innerText = "send"

            const ans = JSON.parse(ipt.value)
            await pc.setRemoteDescription(ans)
            ipt.value = ""
        } else if (dc) {
            dc.send(ipt.value)
            ipt.value = ""
        }
    })

    ansBtn.addEventListener("click", async function(evt: MouseEvent) {
        if (ansBtn) {
            offBtn.innerText = "send"
            ansBtn.parentElement.removeChild(ansBtn)
            ansBtn = null

            const offer = JSON.parse(ipt.value)
            await pc.setRemoteDescription(offer)
            const ans = await pc.createAnswer()
            await pc.setLocalDescription(ans)
            await waitUntilIceGatheringComplete(pc)
            ipt.value = JSON.stringify(pc.localDescription)
        }
    })



}

main()
