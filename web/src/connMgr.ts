import { callInData, clientData, listData, peerMsgSender, signalingEvent, signalingType } from './msgs'
import { registerSignalingHandler } from './ws'
import { Peer } from "./peer"

interface connectionState {
    peerName: string
    connectionName: string
    status: string
}

const conns: { [k: string]: Peer } = {}
const pendingConns: { [k: string]: Peer } = {}
const msgHandlers: Array<(msg: peerMsgSender) => any> = []
const connectionObserver: Array<(msg: connectionState) => any> = []

function onMsgFire (msg: peerMsgSender) {
    msgHandlers.forEach(h => h(msg))
}

function onConnectionObserve (msg: connectionState) {
    connectionObserver.forEach(h => h(msg))
}

function msgHandler (msg: signalingEvent<callInData<RTCIceCandidate | RTCSessionDescription> | clientData | listData>) {
    switch (msg.Type) {
        case signalingType.List:
            handleList(msg.Data as listData)
            break
        case signalingType.Offer:
            handleOffer(msg.Data as callInData)
            break
        case signalingType.Answer:
            handleAnswer(msg.Data as callInData)
            break
        case signalingType.NewClient:
            const cmsg = msg.Data as clientData
            initConn(cmsg.Name)
            break
        case signalingType.ICECandidate:
            handleIceCandidate(msg.Data as callInData<RTCIceCandidate>)
            break

    }
}
registerSignalingHandler(msgHandler)

function handleIceCandidate (data: callInData<RTCIceCandidate>) {
    const name = data.From
    if (!conns[name]) {
        console.warn(`ICECandidate from unknown peer: ${name}`)
        return
    }
    conns[name].conn.addIceCandidate(data.Data)
}

function removeConn (name: string) {
    delete pendingConns[name]
    delete conns[name]
}

function handleList (d: listData) {
    d.List.forEach(c => initConn(c))
}

function observeConnection (p: Peer) {
    p.conn.addEventListener("iceconnectionstatechange", () => {
        onConnectionObserve({
            connectionName: "iceConnectionState",
            peerName: p.name,
            status: p.conn.iceConnectionState
        })
    })
    p.conn.addEventListener("connectionstatechange", () => {
        onConnectionObserve({
            connectionName: "connectionState",
            peerName: p.name,
            status: p.conn.connectionState
        })
    })

}

async function handleOffer (omsg: callInData) {
    const { From: name, Data: offer } = omsg
    if (conns[name] || pendingConns[name]) {
        return
    }
    const p = new Peer(name, removeConn.bind(null, name))
    conns[name] = p
    observeConnection(p)
    await p.sendAnswer(offer)
    p.onMsg(onMsgFire)
}

async function handleAnswer (amsg: callInData) {
    const { From: name, Data: answer } = amsg
    if (!pendingConns[name]) {
        return
    }
    conns[name] = pendingConns[name]
    conns[name].onMsg(onMsgFire)
    delete pendingConns[name]
    await conns[name].setAnswer(answer)
}

async function initConn (name: string) {
    if (conns[name] || pendingConns[name]) {
        return
    }
    const p = new Peer(name, removeConn.bind(null, name))
    observeConnection(p)
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
export function onMsg (handler: (msg: peerMsgSender) => any) {
    msgHandlers.push(handler)
}

export function registerConnectionObserver (h: (msg: connectionState) => any) {
    connectionObserver.push(h)
}


