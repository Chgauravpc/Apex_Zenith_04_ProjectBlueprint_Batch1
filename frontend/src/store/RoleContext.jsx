import { createContext, useContext, useMemo, useState } from "react";
import { PERSONAS } from "@/mock/data";

const RoleContext = createContext(null);

export function RoleProvider({ children }) {
    const [roleId, setRoleId] = useState("priya");
    const value = useMemo(
        () => ({ roleId, setRoleId, persona: PERSONAS[roleId] }),
        [roleId],
    );
    return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
    const ctx = useContext(RoleContext);
    if (!ctx) {
        return {
            roleId: "priya",
            setRoleId: () => {},
            persona: PERSONAS["priya"] || {},
        };
    }
    return ctx;
}
