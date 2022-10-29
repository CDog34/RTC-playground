import { callOutData, clientData, signalingMsg, signalingType } from "./msgs"
import { addSysMsg } from "./msgs.view"

const msgObservers: Array<(msg: signalingMsg) => any> = []
function onObserverFire (msg: signalingMsg<any>) {
    msgObservers.forEach(o => o(msg))
}

const ws = new WebSocket(`ws://${location.hostname}:8080/signaling`)

var myName: string
sendMsg<null>({ Type: signalingType.Hello })

ws.addEventListener("message", (evt: MessageEvent) => {
    let msg = JSON.parse(evt.data) as signalingMsg<any>
    if (msg.Type === signalingType.Hello) {
        msg = msg as signalingMsg<clientData>
        myName = msg.Data?.Name
        addSysMsg(`获得名称：${myName}`)
    }
    onObserverFire(msg)
})

export function registerMsgHandler<T = signalingMsg> (handler: (msg: T) => any) {
    ws.addEventListener("message", (evt: MessageEvent) => {
        const msg = JSON.parse(evt.data)
        handler(msg)
    })
}

export function registerSignalingObserver (observer: (msg: signalingMsg) => any) {
    msgObservers.push(observer)
}

export function onOpen (handler: () => any) {
    if (ws.readyState === ws.OPEN) {
        return handler()
    }
    ws.addEventListener("open", function onOpenEvt () {
        ws.removeEventListener("open", onOpenEvt)
        handler()
    })
}

export function sendMsg<T = callOutData> (msg: signalingMsg<T>) {
    if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(msg))
        onObserverFire(msg)
        return
    }
    ws.addEventListener("open", function onOpenSend () {
        ws.removeEventListener("open", onOpenSend)
        ws.send(JSON.stringify(msg))
        onObserverFire(msg)
    })
}

export function sendOffer (to: string, offer: RTCSessionDescription) {
    sendMsg({
        Type: signalingType.Offer,
        Data: {
            To: to,
            Data: offer
        }
    })
}

export function sendAnswer (to: string, answer: RTCSessionDescription) {
    sendMsg({
        Type: signalingType.Answer,
        Data: {
            To: to,
            Data: answer
        }
    })
}

export function sendICECandidate (to: string, candidate: RTCIceCandidate) {
    sendMsg({
        Type: signalingType.ICECandidate,
        Data: {
            To: to,
            Data: candidate
        }
    })
}

export function requestList () {
    sendMsg<null>({
        Type: signalingType.List,
    })
}

export function getName () {
    return myName
}
