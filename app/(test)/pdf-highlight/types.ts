export type FilterCondition = "AND" | "OR";

export interface TextFilter {
  pattern: string;
  isRegex: boolean;
}

export interface FilterGroup {
  filters: TextFilter[];
  condition: FilterCondition;
}
