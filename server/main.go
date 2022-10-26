package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/websocket"
)

var (
	upgrader = websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		CheckOrigin:     func(r *http.Request) bool { return true },
	}
)

func handleCall(instName string, req signalingRequest, outType signalingRespType) (to string, res signalingResponse, err error) {
	var reqData callInData
	if err = json.Unmarshal(req.Data, &reqData); err != nil {
		return
	}
	res = signalingResponse{Type: outType}
	to = reqData.To
	res.Data, err = json.Marshal(callOutData{From: instName, Data: reqData.Data})
	return
}

func main() {
	store := newStore()
	http.HandleFunc("/signaling", func(rw http.ResponseWriter, r *http.Request) {
		wsconn, err := upgrader.Upgrade(rw, r, nil)
		if err != nil {
			fmt.Printf("ws upgrade error: %+v\n", err)
			return
		}
		writeCh := make(chan signalingResponse, 10)
		instName := strconv.FormatInt(time.Now().UnixNano(), 16)
		store.Register(instName, writeCh)
		ncmsg := signalingResponse{Type: signalingRespTypeNewClient}
		ncmsg.Data, err = json.Marshal(clientData{Name: instName})
		if err != nil {
			fmt.Printf("ws broadcast error: %+v\n", err)
		}
		store.Broadcast(instName, ncmsg)

		defer func() {
			close(writeCh)
			store.Cancel(instName)
			wsconn.Close()
		}()
		go func() {
			for msg := range writeCh {
				if err := wsconn.WriteJSON(msg); err != nil {
					fmt.Printf("ws write error: %+v\n", err)
				}
			}
		}()
		for {
			var req signalingRequest
			if err = wsconn.ReadJSON(&req); err != nil {
				if err != nil {
					fmt.Printf("ws read json failed: %+v\n", err)
					return
				}
			}
			fmt.Printf("ws msg: %+v\n", req)
			switch req.Type {
			case signalingReqTypeList:
				res := signalingResponse{Type: signalingRespTypeList}
				res.Data, err = json.Marshal(listData{List: store.List(instName)})
				if err != nil {
					fmt.Printf("ws write json failed: %+v\n", err)
					continue
				}
				writeCh <- res
			case signalingReqTypeOffer:
				to, res, err := handleCall(instName, req, signalingRespTypeOffer)
				if err != nil {
					fmt.Printf("ws write json failed: %+v\n", err)
				}
				store.SendTo(to, res)
			case signalingReqTypeAnswer:
				to, res, err := handleCall(instName, req, signalingRespTypeAnswer)
				if err != nil {
					fmt.Printf("ws write json failed: %+v\n", err)
				}
				store.SendTo(to, res)
			}
		}
	})
	http.ListenAndServe(":8080", nil)
}
