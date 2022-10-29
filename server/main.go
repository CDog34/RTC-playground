package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	"github.com/gorilla/websocket"
)

var (
	upgrader = websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		CheckOrigin:     func(r *http.Request) bool { return true },
	}
)

func handleCall(instName string, req signalingEvent) (to string, res signalingEvent, err error) {
	var reqData callInData
	if err = json.Unmarshal(req.Data, &reqData); err != nil {
		return
	}
	res = signalingEvent{Type: req.Type}
	to = reqData.To
	res.Data, err = json.Marshal(callOutData{From: instName, Data: reqData.Data})
	return
}

func registerPeerToSore(s *store) IncommingCbk {
	return func(name string, wch chan<- signalingEvent) {
		s.Register(name, wch)
		bmsg := signalingEvent{Type: signalingTypeNewClient}
		bmsg.Data, _ = json.Marshal(clientData{Name: name})
		s.Broadcast(name, bmsg)
	}
}

func main() {
	store := newStore()
	registerPeer := registerPeerToSore(store)
	http.HandleFunc("/signaling", func(rw http.ResponseWriter, r *http.Request) {
		wsconn, err := upgrader.Upgrade(rw, r, nil)
		if err != nil {
			fmt.Printf("ws upgrade error: %+v\n", err)
			return
		}
		p := newPeer(wsconn)
		p.RegisterMsgExchangeCbks(registerPeer, store.SendTo, store.List)
		defer func() {
			p.Close()
			store.Remove(p.Name)
		}()
		if err = p.Start(); err != nil {
			fmt.Fprintf(os.Stderr, "WS connection error, Peer: %+v, errror: %+v\n", p, err)
		}
	})
	http.ListenAndServe(":8080", nil)
}
