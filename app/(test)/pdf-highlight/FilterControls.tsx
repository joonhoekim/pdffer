"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { FilterGroup, TextFilter } from "./types";
import { Plus, X } from "lucide-react";

interface FilterControlsProps {
  filterGroup: FilterGroup;
  onFilterChange: (filterGroup: FilterGroup) => void;
}

export function FilterControls({ filterGroup, onFilterChange }: FilterControlsProps) {
  const addFilter = () => {
    onFilterChange({
      ...filterGroup,
      filters: [...filterGroup.filters, { pattern: "", isRegex: false }],
    });
  };

  const removeFilter = (index: number) => {
    onFilterChange({
      ...filterGroup,
      filters: filterGroup.filters.filter((_, i) => i !== index),
    });
  };

  const updateFilter = (index: number, updates: Partial<TextFilter>) => {
    onFilterChange({
      ...filterGroup,
      filters: filterGroup.filters.map((filter, i) => (i === index ? { ...filter, ...updates } : filter)),
    });
  };

  const toggleCondition = () => {
    onFilterChange({
      ...filterGroup,
      condition: filterGroup.condition === "AND" ? "OR" : "AND",
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button onClick={toggleCondition} variant="outline" size="sm">
          {filterGroup.condition}
        </Button>
        <Button onClick={addFilter} size="sm">
          <Plus className="h-4 w-4" />
          Add Filter
        </Button>
      </div>

      {filterGroup.filters.map((filter, index) => (
        <div key={`filter-${index}`} className="flex items-center gap-2">
          <Input value={filter.pattern} onChange={(e) => updateFilter(index, { pattern: e.target.value })} placeholder="Enter filter text or regex" />
          <div className="flex items-center gap-1">
            <Switch checked={filter.isRegex} onCheckedChange={(checked) => updateFilter(index, { isRegex: checked })} />
            <span className="text-sm">Regex</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => removeFilter(index)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
