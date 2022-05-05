import React from "react";
import Head from "next/head";
import { Box, Container, ContainerProps, MenuItem } from "@mui/material";
import { ProfileLoader } from "../profile";
import Navigation from "./Navigation";

type LayoutProps = {
  headTitle: string,
  bodyTitle: string,
  menuItems: {
    href: string,
    textContent: string,
  }[],
  profile: ProfileLoader,
  containerProps?: Omit<ContainerProps, "children">,
  bottom?: React.ReactNode,
};

const Layout: React.FC<LayoutProps> = ({ children, ...props }) => (
  <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
    <Head>
      <title>{ props.headTitle }</title>
  </Head>
    <Navigation title={ props.bodyTitle } profile={ props.profile }>
      {
        /* FIXME: これは <ul><a></a></ul> を生産する。 */
        props.menuItems.map(({ href, textContent }, i) => (
          <MenuItem component="a" href={ href } key={ i }>
            { textContent }
          </MenuItem>
        ))
      }
    </Navigation>
    <Container
      { ...props.containerProps }
      sx={{ flex: "auto", overflowY: "auto" , py: 2, ...props.containerProps?.sx }}
    >
      { children }
    </Container>
    { props.bottom }
  </Box>
);

export default Layout;

