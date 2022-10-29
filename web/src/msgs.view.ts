import { peerMsg, peerMsgType } from "./msgs"

function colorHash (name: string): number {
    let res = 0
    for (let i = 0; i < name.length; i++) {
        res = (res + name.charCodeAt(i)) % 10
    }
    return res + 1
}

export function addMsg (sender: string, msg: peerMsg) {
    const ctnr = document.createElement("div")
    ctnr.className = `msg-item color-${sender.toLowerCase() === "system" ? "system" : colorHash(sender)}`
    ctnr.innerHTML = `<p class="msg-sender">${sender} :</p><p class="msg-content">${msg.Data}</p>`
    const msgCntr = document.getElementById("msgCtnr")
    msgCntr.appendChild(ctnr)
    msgCntr.scrollTop = msgCntr.scrollHeight
}

export function addSysMsg (msg: string) {
    addMsg("System", { Type: peerMsgType.Text, Data: msg })
}
