import { broadcast, registerConnectionObserver, onMsg } from "./connMgr"
import { onOpen, registerSignalingObserver, getName } from "./ws"
import { addMsg, addSysMsg } from "./msgs.view"
import { peerMsgSender, peerMsg, peerMsgType, callInData, callOutData } from "./msgs"

addSysMsg("开始初始化")
onOpen(addSysMsg.bind(null, "已连接到信令服务"))

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

registerSignalingObserver(msg => {
    const i = msg.Data as callInData
    if (i?.From) {
        addSysMsg(`<span style="color:red">[信令]</span> ${i.From}: -> ${msg.Type}`)
        return
    }
    const o = msg.Data as callOutData
    if (o?.To) {
        addSysMsg(`<span style="color:red">[信令]</span> ${o.To}: <- ${msg.Type}`)
    }
})

