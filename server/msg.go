package main

import "encoding/json"

type signalingType string

const (
	signalingTypeNone         signalingType = ""
	signalingTypeList         signalingType = "list"
	signalingTypeNewClient    signalingType = "newClient"
	signalingTypeOffer        signalingType = "offer"
	signalingTypeAnswer       signalingType = "answer"
	signalingTypeICECandidate signalingType = "iceCandidate"
	signalingTypeHello        signalingType = "hello"
)

type signalingEvent struct {
	Type signalingType
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
