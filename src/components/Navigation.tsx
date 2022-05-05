import React, { Suspense, useRef, useState } from "react";
import { AppBar, AppBarProps, Button, Menu, MenuItem, NoSsr, Toolbar, Typography } from "@mui/material";
import { Settings as SettingsIcon } from "@mui/icons-material";
import { ClientName, ProfileLoader } from "../profile";

type NavigationProps = {
  title?: string,
  profile?: ProfileLoader,
  menuItems: MenuItems,
} & AppBarProps;

export type MenuItems = {
  href: string,
  textContent: string,
}[];

const Navigation: React.FC<NavigationProps> = ({ children, title, profile, menuItems, ...props }) => {
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
          {
            profile && (
              <NoSsr>
                <Suspense fallback={ null }>
                  <ClientName profile={ profile } />
                </Suspense>
              </NoSsr>
            )
          }
        </Button>
        <Menu
          anchorEl={ anchorEl.current }
          open={ open }
          onClose={ () => { setOpen(false) } }
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
        >
          {
            /* FIXME: これは <ul><a></a></ul> を生産する。 */
            menuItems.map(({ href, textContent }, i) => (
              <MenuItem component="a" href={ href } key={ i }>
                { textContent }
              </MenuItem>
            ))
          }
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Navigation;
