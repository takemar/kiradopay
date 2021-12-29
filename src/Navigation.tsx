import React, { Suspense, useRef, useState } from "react";
import { AppBar, Button, Menu, NoSsr, Toolbar, Typography } from "@mui/material";
import { Settings as SettingsIcon } from "@mui/icons-material";
import { ClientInfo, ClientName } from "./client-info"

type NavigationProps = {
  clientInfo: ClientInfo,
  title?: string,

};

const Navigation: React.FC<NavigationProps> = ({ children, clientInfo, title }) => {
  const [open, setOpen] = useState<boolean>(false);
  const anchorEl = useRef(null);

  return(
    <AppBar position="static">
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
              <ClientName info={ clientInfo } />
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
