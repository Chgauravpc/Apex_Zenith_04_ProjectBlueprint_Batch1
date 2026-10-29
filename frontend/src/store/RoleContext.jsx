import { createContext, useContext, useMemo } from "react";
import { PERSONAS } from "@/mock/data";
import { DEMO_USERS, useAuthStore } from "@/store/useAuthStore";

const RoleContext = createContext(null);

const personaOf = (user) =>
    Object.values(PERSONAS).find((p) => p.userId === user?.id) || PERSONAS.ramesh;

// The persona shown in the header is the user every API call acts as (useAuthStore).
export function RoleProvider({ children }) {
    const currentUser = useAuthStore((s) => s.currentUser);
    const setUser = useAuthStore((s) => s.setUser);
    const value = useMemo(() => {
        const persona = personaOf(currentUser);
        const setRoleId = (id) => {
            const user = DEMO_USERS.find((u) => u.id === PERSONAS[id]?.userId);
            if (user) setUser(user);
        };
        return { roleId: persona.id, setRoleId, persona };
    }, [currentUser, setUser]);
    return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
    return useContext(RoleContext);
}
