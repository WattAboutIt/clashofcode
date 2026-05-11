import { useEffect, useRef } from "react";

export default function PixelAvatar({ rank = "Satyr", scale = 8 }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = false;

        // Greek mythology SNES-era retro palettes
        const styles = {
            Satyr: { skin: '#d2b48c', outfit: '#a0522d', eye: '#000', detail: '#8b4513' },
            Minotaur: { skin: '#8b0000', outfit: '#3b3b3b', eye: '#ffff00', detail: '#fff8dc' },
            Medusa: { skin: '#8fbc8f', outfit: '#2e8b57', eye: '#ffff00', detail: '#006400' },
            Hercules: { skin: '#f4a460', outfit: '#ff8c00', eye: '#000', detail: '#ffd700' },
            Ares: { skin: '#e6e6fa', outfit: '#8b0000', eye: '#ff0000', detail: '#ff4500' },
            Zeus: { skin: '#fffaf0', outfit: '#4169e1', eye: '#00ffff', detail: '#ffd700' },
        };

        const avatarType = styles[rank] ? rank : "Satyr";
        const colors = styles[avatarType] || styles.Satyr;

        const state = {
            blink: false,
            lastBlinkTime: 0,
            nextBlinkTime: Math.random() * 3000 + 2000,
            blinkDuration: 150
        };

        function drawSprite(x, y, scaleY, isBlinking) {
            ctx.save();

            const anchorY = y + 16;
            ctx.translate(0, anchorY);
            ctx.scale(1, scaleY);
            ctx.translate(0, -anchorY);

            // Body
            ctx.fillStyle = colors.outfit;
            ctx.fillRect(x + 4, y + 8, 8, 8);

            // Head
            ctx.fillStyle = colors.skin;
            ctx.fillRect(x + 3, y + 2, 10, 6);

            // Rank-specific features
            if (avatarType === "Satyr" || avatarType === "Minotaur") {
                ctx.fillStyle = colors.skin;
                ctx.fillRect(x + 1, y + 3, 2, 4);
                ctx.fillRect(x + 13, y + 3, 2, 4);

                ctx.fillStyle = colors.detail; // Horns
                ctx.fillRect(x + 2, y, 2, 3);
                ctx.fillRect(x + 12, y, 2, 3);

                ctx.fillRect(x + 2, y + 4, 1, 1);
                ctx.fillRect(x + 13, y + 4, 1, 1);
            } else if (rank === "Medusa") {
                ctx.fillStyle = colors.detail; // Snakes
                ctx.fillRect(x + 1, y, 14, 2);
                ctx.fillRect(x, y + 2, 2, 4);
            } else if (rank === "Zeus" || rank === "Hercules") {
                ctx.fillStyle = colors.detail; // Crown/Headband
                ctx.fillRect(x + 3, y + 1, 10, 2);
            }

            // Eyes
            if (!isBlinking) {
                ctx.fillStyle = colors.eye;
                ctx.fillRect(x + 5, y + 4, 2, 2);
                ctx.fillRect(x + 9, y + 4, 2, 2);
            } else { // Blink squash
                ctx.fillStyle = colors.outfit;
                ctx.fillRect(x + 5, y + 5, 2, 1);
                ctx.fillRect(x + 9, y + 5, 2, 1);
            }

            // Legs
            ctx.fillStyle = colors.outfit;
            ctx.fillRect(x + 5, y + 16, 2, 3);
            ctx.fillRect(x + 9, y + 16, 2, 3);

            ctx.restore();

            // Shadow (remains static on ground)
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.fillRect(x + 3, y + 20, 10, 2);
        }

        function applyBreathing(time) {
            return 1 + (Math.sin(time * 0.002) * 0.02);
        }

        function applyFloating(time) {
            return Math.sin(time * 0.0015) * 1.5;
        }

        function updateBlinking(time) {
            if (time - state.lastBlinkTime > state.nextBlinkTime) {
                state.blink = true;
                state.lastBlinkTime = time;
                state.nextBlinkTime = Math.random() * 4000 + 2000;
            }
            if (state.blink && (time - state.lastBlinkTime > state.blinkDuration)) {
                state.blink = false;
            }
            return state.blink;
        }

        let startTime = performance.now();
        let animationFrameId;

        function animate(time) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const dt = time - startTime;

            // Use Math.round to force whole pixels, which prevents subpixel anti-aliasing/transparency
            const floatOffset = Math.round(Math.sin(dt * 0.0015) * 1.5);

            const baseX = 8;
            const baseY = 6 + floatOffset;

            drawSprite(baseX, baseY, 1.0, false);

            animationFrameId = requestAnimationFrame(animate);
        }

        animationFrameId = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [rank]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <canvas
                ref={canvasRef}
                width={32}
                height={32}
                style={{
                    imageRendering: 'pixelated',
                    transform: `scale(${scale})`,
                    transformOrigin: 'center center',
                    width: '32px',
                    height: '32px',
                    marginBottom: `${scale * 10}px`
                }}
            />
            <div style={{
                marginTop: `${scale * 8}px`,
                fontFamily: "'Press Start 2P', monospace",
                fontSize: '10px',
                color: '#ffcc00',
            }}>
                {rank.toUpperCase()}
            </div>
        </div>
    );
}
