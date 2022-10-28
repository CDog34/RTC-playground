import { callInData, clientData, listData, wsEvt, wsEvtMsg } from './msgs'
import { registerMsgHandler, sendOffer, sendAnswer } from './ws'

const conns: { [k: string]: Peer } = {}
const pendingConns: { [k: string]: Peer } = {}

function logEvent (pc: RTCPeerConnection, name: string, eventName: string) {
    pc.addEventListener(eventName, console.debug.bind(null, `[RTCPeerConnection][${name}][${eventName}]:`))
}

class Peer {
    public conn: RTCPeerConnection
    public dataChannel: RTCDataChannel

    constructor (public name: string, onDestory: () => any) {
        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: "stun:stun.bluesip.net:3478" }
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
        })
    }
}

function msgHandler (msg: wsEvtMsg<callInData | clientData | listData>) {
    switch (msg.Type) {
        case wsEvt.List:
            handleList(msg.Data as listData)
            break
        case wsEvt.Offer:
            handleOffer(msg.Data as callInData)
            break
        case wsEvt.Answer:
            handleAnswer(msg.Data as callInData)
            break
        case wsEvt.NewClient:
            const cmsg = msg.Data as clientData
            initConn(cmsg.Name)
            break
    }
}

function removeConn (name: string) {
    delete pendingConns[name]
    delete conns[name]
}

function handleList (d: listData) {
    d.List.forEach(c => initConn(c))
}

async function handleOffer (omsg: callInData) {
    const { From: name, Data: offer } = omsg
    if (conns[name] || pendingConns[name]) {
        return
    }
    const p = new Peer(name, removeConn.bind(null, name))
    await p.sendAnswer(offer)
    conns[name] = p
}

async function handleAnswer (amsg: callInData) {
    const { From: name, Data: answer } = amsg
    if (!pendingConns[name]) {
        return
    }
    await pendingConns[name].setAnswer(answer)
    conns[name] = pendingConns[name]
    delete pendingConns[name]
}

async function initConn (name: string) {
    if (conns[name] || pendingConns[name]) {
        return
    }
    const p = new Peer(name, removeConn.bind(null, name))
    await p.sendOffer()
    pendingConns[name] = p
}

export function getPeerNames (): string[] {
    return Object.keys(conns)
}

export function sendPeerMsg<T = any> (to: string, msg: T) {
    conns[to]?.sendMsg(msg)
}

export function broadcast<T = any> (msg: T) {
    const str = JSON.stringify(msg)
    Object.keys(conns).forEach((k) => {
        conns[k].sendTextMsg(str)
    })
}

registerMsgHandler(msgHandler)

