/**
 * Utility files for producing Vega ValueRef for marks
 */
import {getOffsetChannel, PolarPositionChannel, PositionChannel} from '../../../channel';
import {MarkDef} from '../../../mark';

export function getOffset(channel: PositionChannel | PolarPositionChannel, markDef: MarkDef) {
  const offsetChannel = getOffsetChannel(channel);

  // TODO: in the future read from encoding channel too
  const markDefOffsetValue = markDef[offsetChannel];
  if (markDefOffsetValue) {
    return markDefOffsetValue;
  }

  return undefined;
}
