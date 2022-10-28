import { callInData, clientData, listData, peerMsgSender, wsEvt, wsEvtMsg } from './msgs'
import { registerMsgHandler } from './ws'
import { Peer } from "./peer"
import { addSysMsg } from './msgs.view'

const conns: { [k: string]: Peer } = {}
const pendingConns: { [k: string]: Peer } = {}
const msgHandlers: Array<(msg: peerMsgSender) => any> = []

function onMsgFire (msg: peerMsgSender) {
    msgHandlers.forEach(h => h(msg))
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
    conns[name].onMsg(onMsgFire)
    // addSysMsg(`尝试被动建立连接：${name}`)
}

async function handleAnswer (amsg: callInData) {
    const { From: name, Data: answer } = amsg
    if (!pendingConns[name]) {
        return
    }
    await pendingConns[name].setAnswer(answer)
    conns[name] = pendingConns[name]
    conns[name].onMsg(onMsgFire)
    delete pendingConns[name]
    // addSysMsg(`收到响应：${name}`)
}

async function initConn (name: string) {
    if (conns[name] || pendingConns[name]) {
        return
    }
    // addSysMsg(`尝试主动建立连接：${name}`)
    const p = new Peer(name, removeConn.bind(null, name))
    await p.sendOffer()
    pendingConns[name] = p
    // addSysMsg(`发送请求：${name}`)
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

registerMsgHandler(msgHandler)

