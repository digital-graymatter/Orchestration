/* ── Pipeline logic — agent ordering and routing ── */
import { AGENT_ORDER } from '../agents/index';

/** Logical downstream routing map */
export const DOWNSTREAM_OPTIONS = {
  brief: ['strategy', 'copy'],
  strategy: ['copy'],
  copy: ['compliance'],
  compliance: [],
};

/** Active pipeline given current toggles */
export function getActivePipeline(stageToggles) {
  return AGENT_ORDER.filter((id) => stageToggles[id]);
}

/** Next agent in active pipeline */
export function getNextInPipeline(currentId, stageToggles) {
  const pipeline = getActivePipeline(stageToggles);
  const idx = pipeline.indexOf(currentId);
  if (idx === -1 || idx === pipeline.length - 1) return null;
  return pipeline[idx + 1];
}

/** Previous agent in active pipeline */
export function getPrevInPipeline(currentId, stageToggles) {
  const pipeline = getActivePipeline(stageToggles);
  const idx = pipeline.indexOf(currentId);
  if (idx <= 0) return null;
  return pipeline[idx - 1];
}

/** Downstream options filtered by toggles and completion */
export function getDownstreamOptions(currentId, executionMode, stageToggles, completedAgents) {
  const options = DOWNSTREAM_OPTIONS[currentId] || [];
  if (executionMode === 'multi') {
    const nextInPipeline = getNextInPipeline(currentId, stageToggles);
    const result = [];
    if (nextInPipeline) result.push(nextInPipeline);
    options.forEach((id) => {
      if (id !== nextInPipeline && !completedAgents.includes(id) && stageToggles[id]) {
        result.push(id);
      }
    });
    return result;
  }
  return options.filter((id) => !completedAgents.includes(id) && stageToggles[id]);
}
