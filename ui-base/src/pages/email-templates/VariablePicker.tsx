"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";

interface VariablePickerProps {
  variables: string[];
  onInsert: (variable: string) => void;
  disabled?: boolean;
}

export function VariablePicker({ variables, onInsert, disabled }: VariablePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredVariables = variables.filter((variable) =>
    variable.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInsert = (variable: string) => {
    onInsert(variable);
    setIsOpen(false);
    setSearchTerm("");
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className="h-8 w-8 p-0"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search variables..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8"
            />
          </div>
          <div className="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {filteredVariables.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">
                No variables found
              </p>
            ) : (
              <div className="space-y-1">
                {filteredVariables.map((variable) => (
                  <Button
                    key={variable}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start h-auto p-2"
                    onClick={() => handleInsert(variable)}
                  >
                    <div className="flex flex-col items-start">
                      <code className="text-xs font-mono">
                        {`{{${variable}}}`}
                      </code>
                      <span className="text-xs text-muted-foreground">
                        {variable.replace(/([A-Z])/g, ' $1').toLowerCase()}
                      </span>
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
