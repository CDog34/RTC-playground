package main

import (
	"encoding/json"
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/gorilla/websocket"
)

type IncommingCbk func(name string, wch chan<- signalingEvent)
type outgoingCbk func(name string, msg signalingEvent)
type listPeersCbk func(name string) []string

type peer struct {
	Name string

	conn    *websocket.Conn
	writeCh chan signalingEvent

	msgIncommingCbk IncommingCbk
	msgOutgoingCbk  outgoingCbk
	listPeersCbk    listPeersCbk
}

func newPeer(conn *websocket.Conn) (p *peer) {
	p = &peer{
		Name:    strconv.FormatInt(time.Now().UnixNano(), 16),
		writeCh: make(chan signalingEvent, 10),
		conn:    conn,
	}
	return
}

func (p *peer) genResponse(req signalingEvent) (to string, res signalingEvent, err error) {
	var reqData callInData
	if err = json.Unmarshal(req.Data, &reqData); err != nil {
		return
	}
	res = signalingEvent{Type: req.Type}
	to = reqData.To
	res.Data, err = json.Marshal(callOutData{From: p.Name, Data: reqData.Data})
	return
}

func (p *peer) RegisterMsgExchangeCbks(incomming IncommingCbk, outgoing outgoingCbk, listPeer listPeersCbk) {
	p.msgIncommingCbk = incomming
	p.msgOutgoingCbk = outgoing
	p.listPeersCbk = listPeer
}

func (p *peer) Close() {
	close(p.writeCh)
	p.conn.Close()
}

func (p *peer) Start() (err error) {
	go func() {
		for msg := range p.writeCh {
			if err := p.conn.WriteJSON(msg); err != nil {
				fmt.Printf("ws write error: %+v\n", err)
			}
		}
	}()
	for {
		var req signalingEvent
		if err = p.conn.ReadJSON(&req); err != nil {
			if err != nil {
				return
			}
		}
		if herr := p.handle(req); herr != nil {
			fmt.Fprintf(os.Stderr, "Handle siginaling request error req: %+v, err:%+v\n", req, herr)
		}
	}

}

func (p *peer) handle(req signalingEvent) (err error) {
	switch req.Type {
	case signalingTypeHello:
		res := signalingEvent{Type: signalingTypeHello}
		if res.Data, err = json.Marshal(clientData{Name: p.Name}); err != nil {
			return
		}
		p.writeCh <- res
		if p.msgIncommingCbk == nil {
			return
		}
		p.msgIncommingCbk(p.Name, p.writeCh)
	case signalingTypeList:
		if p.listPeersCbk == nil {
			return
		}
		res := signalingEvent{Type: signalingTypeList}
		res.Data, err = json.Marshal(listData{List: p.listPeersCbk(p.Name)})
		if err != nil {
			return err
		}
		p.writeCh <- res
	case signalingTypeOffer, signalingTypeAnswer, signalingTypeICECandidate:
		if p.msgOutgoingCbk == nil {
			return
		}
		to, res, gerr := p.genResponse(req)
		if gerr != nil {
			err = gerr
			return
		}
		p.msgOutgoingCbk(to, res)
	}
	return
}
