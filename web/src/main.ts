import { broadcast, getPeerNames, onMsg } from "./connMgr"
import { onOpen, registerMsgHandler } from "./ws"
import { addMsg, addSysMsg } from "./msgs.view"
import { peerMsgSender, peerMsg, peerMsgType } from "./msgs"

addSysMsg("开始初始化")
onOpen(addSysMsg.bind(null, "已连接到信令服务"))

function sendMsg () {
    const ipt = document.getElementById("ipt") as HTMLTextAreaElement
    if (!ipt.value) {
        return
    }
    broadcast<peerMsg>({ Type: peerMsgType.Text, Data: ipt.value })
    addSysMsg(`发送消息：${ipt.value}`)
    ipt.value = ""
}
document.getElementById("submitBtn").addEventListener("click", sendMsg)

onMsg((msg: peerMsgSender) => {
    addMsg(msg.From, msg.Msg)
})
registerMsgHandler(msg => {
    addSysMsg(`信令：${msg.Type}`)
})

