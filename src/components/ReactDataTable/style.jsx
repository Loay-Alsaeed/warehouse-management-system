export const getDTCustomStyles = (theme, stickyFirstColumn) => ({
    table: {
        style: {
            borderRadius: theme.shape.borderRadius *1.9,
            // paddingInline: theme.spacing(1.5),
            backgroundColor: "#1e2939",
            color: "white",
        }
    },
    headRow: {
        style: {
            color: "white",
            backgroundColor: "#364153",
            fontWeight: 600,
            paddingTop: theme.spacing(2),
            paddingBottom: theme.spacing(2),
            letterSpacing: "1px",
            borderBottomColor: theme.palette.primary.main,
            "& div": {
                whiteSpace: "pre-line",

            }
        },
    },
    head: {
        style: {
            zIndex: 101
        }
    },

    rows: {
        style: {
            backgroundColor: "#1e2939",
            color: "white",
            '&:not(:last-of-type)': {
                borderBottomStyle: "dashed",

            },
            "&:hover": {
                color: "white",
                backgroundColor: "#364153",
            },
        },
    },
    pagination: {
        style: {
            borderBottomLeftRadius: theme.shape.borderRadius * 1.9,
            borderBottomRightRadius: theme.shape.borderRadius * 1.9,
            borderTopColor: theme.palette.primary.main,
            backgroundColor: "#364153",
            color: "white",
    
            "& button": {
                color: "white",
                fill: "white", 
            },
    
            "& svg": {
                fill: "white",
            },
        },
    },
    cells: {
        style: {
            paddingBlock: theme.spacing(2),

            ...(stickyFirstColumn && {
                "&:first-of-type": {
                    position: "sticky",
                    left: 0,
                    right: 0,
                    zIndex: 99,
                    backgroundColor: "#364153",
                },
            }),
        },
    },

    headCells: {
        style: {
            ...(stickyFirstColumn && {
                "&:first-of-type": {
                    position: "sticky",
                    left: 0,
                    right: 0,
                    zIndex: 100,
                    backgroundColor: "#364153",
                },
            }),
        },
    },

});
