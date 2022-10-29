export enum signalingType {
    Offer = "offer",
    Answer = "answer",
    NewClient = "newClient",
    List = "list",
    ICECandidate = "iceCandidate",
    Hello = "hello",
}

export interface signalingMsg<T = null> {
    Type: signalingType
    Data?: T
}

export interface callInData<T = RTCSessionDescription> {
    From: string
    Data: T
}

export interface listData {
    List: string[]
}

export interface clientData {
    Name: string
}

export interface callOutData<T = RTCSessionDescription> {
    To: string
    Data: T
}

export enum peerMsgType {
    Text = "text",
}

export interface peerMsg {
    Type: peerMsgType,
    Data: string
}

export interface peerMsgSender {
    From: string
    Msg: peerMsg
}

