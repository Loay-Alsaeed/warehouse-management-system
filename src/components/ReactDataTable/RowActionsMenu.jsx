import React, { useState } from "react";
import {
    IconButton,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText
} from "@mui/material";
import TocOutlinedIcon from '@mui/icons-material/TocOutlined';

const RowActionsMenu = ({ actions = [] }) => {
    const [anchorEl, setAnchorEl] = useState(null);

    const open = Boolean(anchorEl);

    const handleOpen = (event) => {
        event.stopPropagation();
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const safeActions = actions.filter(Boolean);
    const hasActions = safeActions.length > 0;

    return (
        <>
            <IconButton onClick={handleOpen} disabled={!hasActions}>
                <TocOutlinedIcon sx={{ color: "white" }} />
            </IconButton>

            <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
                {safeActions.map((action, index) => {
                    if (action.component) {
                        return (
                            <MenuItem key={index}>
                                {action.component}
                            </MenuItem>
                        );
                    }

                    return (
                        <MenuItem
                            key={index}
                            disabled={action.disabled}
                            onClick={() => {
                                handleClose();
                                action.onClick?.();
                            }}
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px"
                            }}
                    
                        >
                            <ListItemText>{action.label}</ListItemText>
                            <ListItemIcon>{action.icon}</ListItemIcon>
                        </MenuItem>
                    );
                })}
            </Menu>
        </>
    );
};

export default RowActionsMenu;