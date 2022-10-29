import { callOutData, clientData, signalingEvent, signalingType } from "./msgs"

export enum signalingObserveType {
    Open,
    Close,
    Name,
    Business,
    Connecting,
}

interface observeMsg {
    type: signalingObserveType
    msg?: signalingEvent<any>
}

const signalingObservers: Array<(msg: observeMsg) => any> = []
const signalingHandlers: Array<(msg: signalingEvent) => any> = []

let myName: string
let ws: WebSocket

function connect () {
    onObserverFire({ type: signalingObserveType.Connecting })
    ws = new WebSocket(process.env.SIGNALING_URL || `ws://${location.hostname}:8080/signaling`)
    ws.addEventListener("open", () => onObserverFire({ type: signalingObserveType.Open }))
    ws.addEventListener("close", () => {
        onObserverFire({ type: signalingObserveType.Close })
        connect()
    })
    ws.addEventListener("message", (evt: MessageEvent) => {
        let msg = JSON.parse(evt.data) as signalingEvent<any>
        if (msg.Type === signalingType.Hello) {
            msg = msg as signalingEvent<clientData>
            myName = msg.Data?.Name
            onObserverFire({ type: signalingObserveType.Name })
        }
        onSignalingFire(evt)
        onBizObserverFire(msg)
    })
    sendMsg<null>({ Type: signalingType.Hello })
}
connect()

function onObserverFire (msg: observeMsg) {
    Promise.resolve().then(() =>
        signalingObservers.forEach(o => o(msg))
    )
}
function onBizObserverFire (msg: signalingEvent<any>) {
    onObserverFire({ type: signalingObserveType.Business, msg })
}

function onSignalingFire (evt: MessageEvent) {
    const msg = JSON.parse(evt.data)
    signalingHandlers.forEach(h => h(msg))
}

export function registerSignalingHandler (handler: (msg: signalingEvent) => any) {
    signalingHandlers.push(handler)
}

export function registerSignalingObserver (observer: (msg: observeMsg) => any) {
    signalingObservers.push(observer)
}

export function sendMsg<T = callOutData> (msg: signalingEvent<T>) {
    if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(msg))
        onBizObserverFire(msg)
        return
    }
    ws.addEventListener("open", function onOpenSend () {
        ws.removeEventListener("open", onOpenSend)
        ws.send(JSON.stringify(msg))
        onBizObserverFire(msg)
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
