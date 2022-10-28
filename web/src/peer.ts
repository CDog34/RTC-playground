import { peerMsgSender } from "./msgs"
import { sendOffer, sendAnswer } from "./ws"
function logEvent (pc: RTCPeerConnection, name: string, eventName: string) {
    pc.addEventListener(eventName, console.debug.bind(null, `[RTCPeerConnection][${name}][${eventName}]:`))
}

export class Peer {
    public conn: RTCPeerConnection
    public dataChannel: RTCDataChannel
    public onMsgHandler: (msg: peerMsgSender) => any

    constructor (public name: string, onDestory: () => any) {
        const pc = new RTCPeerConnection({
            iceServers: [
                // { urls: "stun:stun.l.google.com:19302" },
                { urls: "stun:stun1.l.google.com:19302" },
                // { urls: "stun:stun2.l.google.com:19302" },
                // { urls: "stun:stun3.l.google.com:19302" },
                // { urls: "stun:stun4.l.google.com:19302" }
            ]
        })
        logEvent(pc, name, "connectionstatechange")
        logEvent(pc, name, "datachannel")
        logEvent(pc, name, "icecandidate")
        logEvent(pc, name, "icecandidateerror")
        logEvent(pc, name, "iceconnectionstatechange")
        logEvent(pc, name, "icegatheringstatechange")
        logEvent(pc, name, "negotiationneeded")
        logEvent(pc, name, "signalingstatechange")
        logEvent(pc, name, "track")
        pc.addEventListener("connectionstatechange", function onCC () {
            if (pc.connectionState === "failed") {
                onDestory()
            }
        })
        this.conn = pc
    }

    public async sendOffer () {
        this.setupDataChannel(this.conn.createDataChannel("nep"))
        const offer = await this.conn.createOffer()
        await this.conn.setLocalDescription(offer)
        await this.waitUntilIceGatheringComplete()
        sendOffer(this.name, this.conn.localDescription)
    }

    public async sendAnswer (offer: RTCSessionDescription) {
        await this.conn.setRemoteDescription(offer)
        const answer = await this.conn.createAnswer()
        await this.conn.setLocalDescription(answer)
        await this.waitUntilIceGatheringComplete()
        const inst = this
        this.conn.addEventListener("datachannel", function ondatachannel (evt: RTCDataChannelEvent) {
            inst.conn.removeEventListener("datachannel", ondatachannel)
            inst.setupDataChannel.call(inst, evt.channel)
        })
        sendAnswer(this.name, this.conn.localDescription)
    }

    public async setAnswer (answer: RTCSessionDescription) {
        await this.conn.setRemoteDescription(answer)
    }

    public sendMsg<T> (msg: T) {
        this.sendMsg(JSON.stringify(msg))
    }

    public sendTextMsg (msg: string) {
        if (!this.dataChannel) {
            return
        }
        if (this.dataChannel.readyState === "open") {
            this.dataChannel.send(msg)
        } else {
            const inst = this
            this.dataChannel.addEventListener("open", function onDCOpen () {
                inst.dataChannel.removeEventListener("open", onDCOpen)
                inst.dataChannel.send(msg)
            })
        }
    }

    public onMsg (h: (msg: peerMsgSender) => any) {
        this.onMsgHandler = h
    }

    private waitUntilIceGatheringComplete (): Promise<void> {
        if (this.conn.iceGatheringState === "complete") {
            return Promise.resolve()
        }
        return new Promise(res => {
            const conn = this.conn
            this.conn.addEventListener("icegatheringstatechange", function onStateChange () {
                if (conn.iceGatheringState === "complete") {
                    res()
                    conn.removeEventListener("icegatheringstatechange", onStateChange)
                }
            })
        })
    }

    private setupDataChannel (dc: RTCDataChannel) {
        if (this.dataChannel) {
            return
        }
        this.dataChannel = dc
        this.dataChannel.addEventListener("message", (msg: MessageEvent) => {
            console.log(`[RTCPeerConnection][${this.name}][RTCDataChannel][message]:`, msg)
            if (this.onMsgHandler) {
                const bmsg = JSON.parse(msg.data)
                this.onMsgHandler({
                    From: this.name,
                    Msg: bmsg
                })
            }
        })
    }
}
