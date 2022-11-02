package main

import (
	"crypto/md5"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/websocket"
)

const (
	nameCookieName = "client-name"
	cookieSecret   = "NEPNEP"
)

func encodeName(v string) (s string) {
	h := md5.Sum([]byte(v + cookieSecret))
	b := base64.URLEncoding.EncodeToString([]byte(v))
	return b + ":" + hex.EncodeToString(h[:])
}

func decodeName(s string) (v string) {
	vs := strings.Split(s, ":")
	if len(vs) != 2 {
		return
	}
	d, err := base64.URLEncoding.DecodeString(vs[0])
	if err != nil {
		return
	}
	h := md5.Sum(append(d, []byte(cookieSecret)...))
	if hex.EncodeToString(h[:]) == vs[1] {
		v = string(d)
	}
	return
}

func getNameFromReq(r *http.Request) (n string) {
	rn, err := r.Cookie(nameCookieName)
	if err != nil {
		return
	}
	return decodeName(rn.Value)
}

var (
	upgrader = websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		CheckOrigin: func(r *http.Request) bool {
			o := r.Header.Get("origin")
			if o == "" {
				return false
			}
			u, err := url.Parse(o)
			if err != nil {
				return false
			}
			h := u.Hostname()
			return strings.HasSuffix(h, "tuku.tech") || strings.HasSuffix(h, "izhai.net")
		},
	}
)

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
		n := strconv.FormatInt(time.Now().UnixNano(), 16)
		// n := getNameFromReq(r)
		// if n == "" {
		// 	n = strconv.FormatInt(time.Now().UnixNano(), 16)
		// 	http.SetCookie(rw, &http.Cookie{Name: nameCookieName, Value: encodeName(n)})
		// }
		wsconn, err := upgrader.Upgrade(rw, r, rw.Header().Clone())
		if err != nil {
			fmt.Printf("ws upgrade error: %+v\n", err)
			return
		}
		p := newPeer(wsconn, n)
		p.RegisterMsgExchangeCbks(registerPeer, store.SendTo, store.List)
		defer func() {
			p.Close()
			store.Remove(p.Name)
		}()
		if err = p.Start(); err != nil {
			fmt.Fprintf(os.Stderr, "WS connection error, Peer: %+v, errror: %+v\n", p, err)
		}
	})
	if err := http.ListenAndServe(":8080", nil); err != nil {
		fmt.Fprintf(os.Stderr, "Server bind failed: %+v", err)
	}
}
