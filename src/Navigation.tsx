import React, { Suspense, useRef, useState } from "react";
import { AppBar, AppBarProps, Button, Menu, NoSsr, Toolbar, Typography } from "@mui/material";
import { Settings as SettingsIcon } from "@mui/icons-material";
import { ClientName } from "./profile"

type NavigationProps = {
  title?: string,
} & AppBarProps;

const Navigation: React.FC<NavigationProps> = ({ children, title, ...props }) => {
  const [open, setOpen] = useState<boolean>(false);
  const anchorEl = useRef(null);

  return(
    <AppBar position="static" { ...props }>
      <Toolbar variant="dense" ref={ anchorEl }>
        <Typography component="h1" sx={{ flexGrow: 1 }}>
          { title }
        </Typography>
        <Button
          variant="text"
          endIcon={<SettingsIcon />}
          color="inherit"
          onClick={ () => { setOpen(!open) }}
        >
          <NoSsr>
            <Suspense fallback={ null }>
              <ClientName />
            </Suspense>
          </NoSsr>
        </Button>
        <Menu
          anchorEl={ anchorEl.current }
          open={ open }
          onClose={ () => { setOpen(false) } }
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
        >
          { children }
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Navigation;
