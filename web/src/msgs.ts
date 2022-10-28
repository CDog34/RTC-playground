export enum wsEvt {
    Offer = "offer",
    Answer = "answer",
    NewClient = "newClient",
    List = "list",
}

export interface wsEvtMsg<T> {
    Type: wsEvt
    Data: T
}

export interface callInData {
    From: string
    Data: RTCSessionDescription
}

export interface listData {
    List: string[]
}

export interface clientData {
    Name: string
}

export enum wsReq {
    Offer = "offer",
    Answer = "answer",
    List = "list",
}

export interface wsReqMsg<T = null> {
    Type: wsReq
    Data?: T
}

export interface callOutData {
    To: string
    Data: RTCSessionDescription
}
