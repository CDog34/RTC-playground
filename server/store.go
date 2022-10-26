package main

import "sync"

type store struct {
	storage sync.Map
}

func newStore() *store {
	return &store{
		storage: sync.Map{},
	}
}

func (s *store) Register(name string, ch chan<- signalingResponse) {
	s.storage.Store(name, ch)
}

func (s *store) Cancel(name string) {
	s.storage.Delete(name)
}

func (s *store) List(except string) (res []string) {
	res = make([]string, 0)
	s.storage.Range(func(key, value interface{}) bool {
		k, ok := key.(string)
		if !ok {
			return true
		}
		if k == except {
			return true
		}
		res = append(res, k)
		return true
	})
	return
}

func (s *store) SendTo(name string, data signalingResponse) {
	v, ok := s.storage.Load(name)
	if !ok {
		return
	}
	ch, ok := v.(chan<- signalingResponse)
	if !ok {
		return
	}
	ch <- data
}

func (s *store) Broadcast(except string, data signalingResponse) {
	s.storage.Range(func(key, value interface{}) bool {
		k, ok := key.(string)
		if !ok {
			return true
		}
		if k == except {
			return true
		}
		v, ok := value.(chan<- signalingResponse)
		if !ok {
			return true
		}
		v <- data
		return true
	})
}
