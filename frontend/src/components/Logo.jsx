export default function Logo({ size = 34 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-label="Blueprint logo">
            <path
                d="M24 5 41 14.75v18.5L24 43 7 33.25v-18.5z"
                stroke="#11161B"
                strokeWidth="3.2"
                strokeLinejoin="round"
            />
            <path
                d="M24 32.5v-15m0 0-5.5 5.5m5.5-5.5 5.5 5.5"
                stroke="#D96B27"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}
