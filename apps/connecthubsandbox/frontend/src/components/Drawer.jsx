const placements = {
    right: { top: 0, right: 0, height: "100%", width: "350px", transition: "transform 0.3s", transform: "translateX(0)" },
    left: { top: 0, left: 0, height: "100%", width: "350px", transition: "transform 0.3s", transform: "translateX(0)" },
    top: { top: 0, left: 0, width: "100%", height: "250px", transition: "transform 0.3s", transform: "translateY(0)" },
    bottom: { bottom: 0, left: 0, width: "100%", height: "250px", transition: "transform 0.3s", transform: "translateY(0)" },
};

const hiddenTransforms = {
    right: "translateX(100%)",
    left: "translateX(-100%)",
    top: "translateY(-100%)",
    bottom: "translateY(100%)",
};

const Drawer = ({
    open,
    onClose,
    placement = "left",
    children,
    style = {},
    drawerStyle = {},
    className = ""
}) => {
    if (!["right", "left", "top", "bottom"].includes(placement)) placement = "right";
    return (
        <>
            {/* Overlay */}
            <div
                onClick={onClose}
                style={{
                    display: open ? "block" : "none",
                    position: "fixed",
                    inset: 0,
                    background: "#02375D59",
                    zIndex: 1000,
                }}
            />
            {/* Drawer */}
            <div
                className={className}
                style={{
                    position: "fixed",
                    background: "#FFFFFF",
                    zIndex: 999999,
                    ...placements[placement],
                    ...style,
                    transform: open
                        ? placements[placement].transform
                        : hiddenTransforms[placement],
                    pointerEvents: open ? "auto" : "none",
                }}
            >
                {/* Content */}
                <div style={{ ...drawerStyle }} >
                    {children}
                </div>
            </div>
        </>
    );
};

export default Drawer;
