import { broadcast, getPeerNames } from "./connMgr"

window["list"] = getPeerNames
window["send"] = broadcast
