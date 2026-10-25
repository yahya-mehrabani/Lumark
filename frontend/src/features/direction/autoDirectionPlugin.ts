import {
  rehypeDirectionResolver,
  DEFAULT_AUTO_DIR_TAGS,
  type DirectionResolverOptions,
} from './resolver';

export { DEFAULT_AUTO_DIR_TAGS };
export type RehypeAutoDirectionOptions = DirectionResolverOptions;

/**
 * Rehype plugin that attaches `dir="auto"` to textual block elements
 * and resolves direction precedence (PRD FR-DIR-001, FR-DIR-002, FR-DIR-003, US-017, US-018).
 */
export const rehypeAutoDirection = rehypeDirectionResolver;
export { rehypeDirectionResolver };

export default rehypeAutoDirection;
