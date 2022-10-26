package main

import "encoding/json"

type signalingReqType string

const (
	signalingReqTypeList   signalingReqType = "list"
	signalingReqTypeOffer  signalingReqType = "offer"
	signalingReqTypeAnswer signalingReqType = "answer"
)

type signalingRequest struct {
	Type signalingReqType
	Data json.RawMessage
}

type signalingRespType string

const (
	signalingRespTypeNone      signalingRespType = ""
	signalingRespTypeList      signalingRespType = "list"
	signalingRespTypeNewClient signalingRespType = "newClient"
	signalingRespTypeOffer     signalingRespType = "offer"
	signalingRespTypeAnswer    signalingRespType = "answer"
)

type signalingResponse struct {
	Type signalingRespType
	Data json.RawMessage
}

type listData struct {
	List []string
}

type clientData struct {
	Name string
}

type callInData struct {
	To   string
	Data json.RawMessage
}

type callOutData struct {
	From string
	Data json.RawMessage
}
