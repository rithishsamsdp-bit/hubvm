import CallStartNode from "./CallStartNode";
import CallEndNode from "./CallEndNode";
import AudioMessageNode from "./AudioMessageNode";
import TimeRuleNode from "./TimeRuleNode";
import DateRuleNode from "./DateRuleNode";
import KeypadNode from "./KeypadNode";
import WaitingExperienceNode from "./WaitingExperienceNode";
import RingToNode from "./RingToNode";
import VoicemailNode from "./VoicemailNode";
import ApiNode from "./ApiNode";
import WssNode from "./WssNode";
import AIBotNode from "./AIBotNode";

const nodeTypes = {
    callStart: CallStartNode,
    callEnd: CallEndNode,
    audioMsg: AudioMessageNode,
    timeRule: TimeRuleNode,
    // dateRule: DateRuleNode,
    keypad: KeypadNode,
    // waitingExp: WaitingExperienceNode,
    ringTo: RingToNode,
    voicemail: VoicemailNode,
    api:ApiNode,
    wss:WssNode,
    aiBot: AIBotNode
};

export default nodeTypes;
