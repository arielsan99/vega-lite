import {rangeType, SCALE_CHANNELS, X, Y} from '../../../src/channel';
import {scaleType} from '../../../src/compile/scale/type';
import * as log from '../../../src/log';
import {BAR, PRIMITIVE_MARKS, RECT, RULE} from '../../../src/mark';
import {ScaleType} from '../../../src/scale';
import {isUTCTimeUnit, TIMEUNITS} from '../../../src/timeunit';
import {NOMINAL, ORDINAL} from '../../../src/type';
import * as util from '../../../src/util';

describe('compile/scale', () => {
  describe('type()', () => {
    it('should return null for channel without scale', () => {
      expect(scaleType({}, 'detail', {type: 'temporal', timeUnit: 'yearmonth'}, 'point')).toEqual(null);
    });

    it(
      'should show warning if users try to override the scale and use bin',
      log.wrap(localLogger => {
        expect(scaleType({type: 'point'}, 'color', {type: 'quantitative', field: 'x', bin: true}, 'point')).toEqual(
          ScaleType.BIN_ORDINAL
        );
        expect(localLogger.warns[0]).toEqual(
          log.message.scaleTypeNotWorkWithFieldDef(ScaleType.POINT, ScaleType.BIN_ORDINAL)
        );
      })
    );

    describe('nominal/ordinal', () => {
      describe('color', () => {
        it('should return ordinal scale for nominal data by default.', () => {
          expect(scaleType({}, 'color', {type: 'nominal'}, 'point')).toEqual(ScaleType.ORDINAL);
        });

        it('should return ordinal scale for ordinal data.', () => {
          expect(scaleType({}, 'color', {type: 'nominal'}, 'point')).toEqual(ScaleType.ORDINAL);
        });
      });

      describe('discrete channel (shape)', () => {
        it('should return ordinal for nominal field', () => {
          expect(scaleType({}, 'shape', {type: 'nominal'}, 'point')).toEqual(ScaleType.ORDINAL);
        });

        it(
          'should return ordinal even if other type is specified',
          log.wrap(localLogger => {
            [ScaleType.LINEAR, ScaleType.BAND, ScaleType.POINT].forEach(badScaleType => {
              expect(scaleType({type: badScaleType}, 'shape', {field: 'x', type: 'nominal'}, 'point')).toEqual(
                ScaleType.ORDINAL
              );
              const warns = localLogger.warns;
              expect(warns[warns.length - 1]).toEqual(
                log.message.scaleTypeNotWorkWithChannel('shape', badScaleType, 'ordinal')
              );
            });
          })
        );

        it(
          'should return ordinal for an ordinal field and throw a warning.',
          log.wrap(localLogger => {
            expect(scaleType({}, 'shape', {type: 'ordinal'}, 'point')).toEqual(ScaleType.ORDINAL);
            expect(localLogger.warns[0]).toEqual(log.message.discreteChannelCannotEncode('shape', 'ordinal'));
          })
        );
      });

      describe('continuous', () => {
        it('should return point scale for ordinal X,Y for marks others than rect, rule, and bar', () => {
          PRIMITIVE_MARKS.forEach(mark => {
            if (util.contains(['bar', 'rule', 'rect', 'image'], mark)) {
              return;
            }

            [ORDINAL, NOMINAL].forEach(t => {
              [X, Y].forEach(channel => {
                expect(scaleType({}, channel, {type: t}, mark)).toEqual(ScaleType.POINT);
              });
            });
          });
        });

        it('should return band scale for ordinal X,Y when mark is rect, rule, bar', () => {
          [ORDINAL, NOMINAL].forEach(t => {
            [X, Y].forEach(channel => {
              [BAR, RULE, RECT].forEach(mark => {
                expect(scaleType({}, channel, {type: t}, mark)).toEqual(ScaleType.BAND);
              });
            });
          });
        });

        it('should return point scale for X,Y when mark is point', () => {
          [ORDINAL, NOMINAL].forEach(t => {
            [X, Y].forEach(channel => {
              expect(scaleType({}, channel, {type: t}, 'point')).toEqual(ScaleType.POINT);
            });
          });
        });

        it(
          'should return point scale for X,Y when mark is point when ORDINAL SCALE TYPE is specified and throw warning',
          log.wrap(localLogger => {
            [ORDINAL, NOMINAL].forEach(t => {
              [X, Y].forEach(channel => {
                expect(scaleType({type: 'ordinal'}, channel, {type: t}, 'point')).toEqual(ScaleType.POINT);
                const warns = localLogger.warns;
                expect(warns[warns.length - 1]).toEqual(
                  log.message.scaleTypeNotWorkWithChannel(channel, 'ordinal', 'point')
                );
              });
            });
          })
        );

        it('should return point scale for ordinal/nominal fields for continuous channels other than x and y.', () => {
          const OTHER_CONTINUOUS_CHANNELS = SCALE_CHANNELS.filter(
            c => rangeType(c) === 'continuous' && !util.contains([X, Y], c)
          );
          PRIMITIVE_MARKS.forEach(mark => {
            [ORDINAL, NOMINAL].forEach(t => {
              OTHER_CONTINUOUS_CHANNELS.forEach(channel => {
                expect(scaleType({}, channel, {type: t}, mark)).toEqual(ScaleType.POINT);
              });
            });
          });
        });
      });
    });

    describe('temporal', () => {
      it('should return time scale for temporal color field by default.', () => {
        expect(scaleType({}, 'color', {type: 'temporal'}, 'point')).toBe('time');
      });

      it(
        'should return ordinal for temporal field and throw a warning.',
        log.wrap(localLogger => {
          expect(scaleType({}, 'shape', {type: 'temporal', timeUnit: 'yearmonth'}, 'point')).toEqual(ScaleType.ORDINAL);
          expect(localLogger.warns[0]).toEqual(log.message.discreteChannelCannotEncode('shape', 'temporal'));
        })
      );

      it('should return time for all non-utc time units.', () => {
        for (const timeUnit of TIMEUNITS.filter(t => !isUTCTimeUnit(t))) {
          expect(scaleType({}, Y, {type: 'temporal', field: 'x', timeUnit: timeUnit}, 'point')).toEqual(ScaleType.TIME);
        }
      });

      it('should return utc for all utc time units.', () => {
        for (const timeUnit of TIMEUNITS.filter(t => isUTCTimeUnit(t))) {
          expect(scaleType({}, Y, {type: 'temporal', field: 'x', timeUnit: timeUnit}, 'point')).toEqual(ScaleType.UTC);
        }
      });
    });
    describe('quantitative', () => {
      it('should return linear scale for quantitative color field by default.', () => {
        expect(scaleType({}, 'color', {type: 'quantitative'}, 'point')).toBe('linear');
      });

      it('should return linear scale for piecewise quantitative color field by default.', () => {
        expect(
          scaleType({domain: [1, 2, 3], range: ['red', 'green', 'blue']}, 'color', {type: 'quantitative'}, 'point')
        ).toEqual(ScaleType.LINEAR);
      });

      it('should return ordinal bin scale for quantitative color field with binning.', () => {
        expect(scaleType({}, 'color', {type: 'quantitative', field: 'x', bin: true}, 'point')).toEqual(
          ScaleType.BIN_ORDINAL
        );
      });

      it(
        'should return ordinal for encoding quantitative field with a discrete channel and throw a warning.',
        log.wrap(localLogger => {
          expect(scaleType({}, 'shape', {type: 'quantitative'}, 'point')).toEqual(ScaleType.ORDINAL);
          expect(localLogger.warns[0]).toEqual(log.message.discreteChannelCannotEncode('shape', 'quantitative'));
        })
      );

      it('should return linear scale for quantitative by default.', () => {
        expect(scaleType({}, 'x', {type: 'quantitative', field: 'x'}, 'point')).toEqual(ScaleType.LINEAR);
      });

      it('should return linear scale for quantitative even if binned.', () => {
        expect(scaleType({}, 'opacity', {type: 'quantitative', field: 'x', bin: true}, 'point')).toEqual(
          ScaleType.LINEAR
        );
      });

      it('should return linear scale for quantitative x and y.', () => {
        expect(scaleType({}, 'x', {type: 'quantitative', field: 'x', bin: true}, 'point')).toEqual(ScaleType.LINEAR);
      });
    });

    describe('dataTypeMatchScaleType()', () => {
      it('should return specified value if datatype is ordinal or nominal and specified scale type is the ordinal or nominal', () => {
        expect(scaleType({type: ScaleType.ORDINAL}, 'shape', {type: 'ordinal'}, 'point')).toEqual(ScaleType.ORDINAL);
      });

      it('should return default scale type if data type is temporal but specified scale type is not time or utc', () => {
        expect(
          scaleType({type: ScaleType.LINEAR}, 'x', {type: 'temporal', field: 'x', timeUnit: 'year'}, 'point')
        ).toEqual(ScaleType.TIME);

        expect(
          scaleType({type: ScaleType.LINEAR}, 'color', {type: 'temporal', field: 'x', timeUnit: 'year'}, 'point')
        ).toBe('time');
      });

      it('should return time if data type is temporal but specified scale type is discrete', () => {
        expect(
          scaleType({type: ScaleType.POINT}, 'x', {type: 'temporal', field: 'x', timeUnit: 'year'}, 'point')
        ).toEqual(ScaleType.TIME);
      });

      it('should return default scale type if data type is temporal but specified scale type is time or utc or any discrete type', () => {
        expect(
          scaleType({type: ScaleType.LINEAR}, 'x', {type: 'temporal', field: 'x', timeUnit: 'year'}, 'point')
        ).toEqual(ScaleType.TIME);
      });

      it('should return utc scale type if data type is temporal and specified scale type is utc', () => {
        expect(
          scaleType({type: ScaleType.UTC}, 'x', {type: 'temporal', field: 'x', timeUnit: 'year'}, 'point')
        ).toEqual(ScaleType.UTC);
      });

      it('should return default scale type if data type is quantative but scale type do not support quantative', () => {
        expect(scaleType({type: ScaleType.TIME}, 'color', {field: 'x', type: 'quantitative'}, 'point')).toEqual(
          ScaleType.LINEAR
        );
      });

      it('should return default scale type if data type is quantative and scale type supports quantative', () => {
        expect(scaleType({type: ScaleType.TIME}, 'x', {field: 'x', type: 'quantitative'}, 'point')).toEqual(
          ScaleType.LINEAR
        );
      });

      it('should return default scale type if data type is quantative and scale type supports quantative', () => {
        expect(scaleType({type: ScaleType.TIME}, 'x', {field: 'x', type: 'temporal'}, 'point')).toEqual(ScaleType.TIME);
      });
    });
  });
});
