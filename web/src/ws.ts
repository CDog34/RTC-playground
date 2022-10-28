import { callOutData, wsReq, wsReqMsg } from "./msgs"

const ws = new WebSocket(`ws://${location.hostname}:8080/signaling`)

ws.addEventListener("message", (evt: MessageEvent) => {
    console.log("[ws][message]:", evt)
})

export function registerMsgHandler<T> (handler: (msg: T) => any) {
    ws.addEventListener("message", (evt: MessageEvent) => {
        const msg = JSON.parse(evt.data)
        handler(msg)
    })
}

export function sendMsg<T> (msg: T) {
    if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(msg))
        return
    }
    ws.addEventListener("open", function onOpenSend () {
        ws.removeEventListener("open", onOpenSend)
        ws.send(JSON.stringify(msg))
    })
}

export function sendOffer (to: string, offer: RTCSessionDescription) {
    sendMsg<wsReqMsg<callOutData>>({
        Type: wsReq.Offer,
        Data: {
            To: to,
            Data: offer
        }
    })
}

export function sendAnswer (to: string, answer: RTCSessionDescription) {
    sendMsg<wsReqMsg<callOutData>>({
        Type: wsReq.Answer,
        Data: {
            To: to,
            Data: answer
        }
    })
}

export function requestList () {
    sendMsg<wsReqMsg>({
        Type: wsReq.List,
    })
}
