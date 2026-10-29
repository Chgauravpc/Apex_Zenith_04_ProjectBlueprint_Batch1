import { PERSONAS } from "@/mock/data";
import { DEMO_USERS, useAuthStore } from "@/store/useAuthStore";

const personaOf = (user) =>
    Object.values(PERSONAS).find((p) => p.userId === user?.id) || PERSONAS.ramesh;

/**
 * The persona shown in the header is the user every API call acts as: both come from
 * useAuthStore, so switching role here switches who the app acts as.
 */
export function useRole() {
    const currentUser = useAuthStore((s) => s.currentUser);
    const setUser = useAuthStore((s) => s.setUser);
    const persona = personaOf(currentUser);
    const setRoleId = (id) => {
        const user = DEMO_USERS.find((u) => u.id === PERSONAS[id]?.userId);
        if (user) setUser(user);
    };
    return { roleId: persona.id, setRoleId, persona };
}

/** Kept so App can wrap routes as before; role state lives in useAuthStore. */
export function RoleProvider({ children }) {
    return children;
}
