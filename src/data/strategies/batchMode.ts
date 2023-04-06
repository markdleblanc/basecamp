import type ImmediateMode from "./immediateMode.js";

export default interface BatchMode extends ImmediateMode
{
    commit() : Promise<void>;
}