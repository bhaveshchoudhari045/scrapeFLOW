import { AppNodeMissingInputs } from "@/types/appNode";
import { Dispatch, ReactNode, SetStateAction, useState } from "react";
import { createContext } from "react";

export const FlowValidationContext =
  createContext<FlowValidationContextType | null>(null);
type FlowValidationContextType = {
  invalideInputs: AppNodeMissingInputs[];
  setInvalidInputs: Dispatch<SetStateAction<AppNodeMissingInputs[]>>;
  clearErrors: () => void;
};

export function FlowValidationContextProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [invalideInputs, setInvalidInputs] = useState<AppNodeMissingInputs[]>(
    [],
  );

  const clearErrors = () => {
    setInvalidInputs([]);
  };

  return (
    <FlowValidationContext.Provider
      value={{
        invalideInputs,
        setInvalidInputs,
        clearErrors,
      }}
    >
      {children}
    </FlowValidationContext.Provider>
  );
}
