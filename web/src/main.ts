import { broadcast, registerConnectionObserver, onMsg } from "./connMgr"
import { registerSignalingObserver, getName, signalingObserveType } from "./ws"
import { addMsg, addSysMsg } from "./msgs.view"
import { peerMsgSender, peerMsg, peerMsgType, callInData, callOutData } from "./msgs"

function sendMsg () {
    const ipt = document.getElementById("ipt") as HTMLTextAreaElement
    if (!ipt.value) {
        return
    }
    const msg: peerMsg = { Type: peerMsgType.Text, Data: ipt.value }
    broadcast<peerMsg>(msg)
    addMsg(getName(), msg)
    ipt.value = ""
}
document.getElementById("submitBtn").addEventListener("click", sendMsg)

onMsg((msg: peerMsgSender) => {
    addMsg(msg.From, msg.Msg)
})

registerConnectionObserver(msg => {
    addSysMsg(`<span style="color:green">[连接]</span>  ${msg.peerName}: ${msg.connectionName} -> ${msg.status}`)
})

registerSignalingObserver(obMsg => {
    switch (obMsg.type) {
        case signalingObserveType.Connecting:
            addSysMsg(`<span style="color:blue">[控制]</span> 信令连接中`)
            break
        case signalingObserveType.Open:
            addSysMsg(`<span style="color:blue">[控制]</span> 信令已连接`)
            break
        case signalingObserveType.Close:
            addSysMsg(`<span style="color:blue">[控制]</span> 信令已断开`)
            break
        case signalingObserveType.Name:
            addSysMsg(`<span style="color:blue">[控制]</span> 名称已分配：${getName()}`)
            break
        case signalingObserveType.Business:
            const { msg } = obMsg
            const i = msg.Data as callInData
            if (i?.From) {
                addSysMsg(`<span style="color:red">[信令]</span> ${i.From}: -> ${msg.Type}`)
                return
            }
            const o = msg.Data as callOutData
            if (o?.To) {
                addSysMsg(`<span style="color:red">[信令]</span> ${o.To}: <- ${msg.Type}`)
            }
            break
    }

})

