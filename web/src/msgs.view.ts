import { peerMsg, peerMsgType } from "./msgs"

export function addMsg (sender: string, msg: peerMsg) {
    const ctnr = document.createElement("div")
    const color = parseInt(sender, 16) % 10 + 1
    ctnr.className = `msg-item color-${sender.toLowerCase() === "system" ? "system" : color}`
    ctnr.innerHTML = `<p class="msg-sender">${sender} :</p><p class="msg-content">${msg.Data}</p>`
    const msgCntr = document.getElementById("msgCtnr")
    msgCntr.appendChild(ctnr)
    msgCntr.scrollTop = msgCntr.scrollHeight
}

export function addSysMsg (msg: string) {
    addMsg("System", { Type: peerMsgType.Text, Data: msg })
}
