import React, { Suspense } from "react";
import Head from "next/head";
import { AppBar, Box, Button, CircularProgress, Container, IconButton, NoSsr, TextField, Toolbar, Typography } from "@mui/material";
import { AccountCircle as AccountCircleIcon } from "@mui/icons-material";
import AppIDB from "../AppIDB";
import { ClientInfo, ClientName } from "../client-info";
import styles from "../styles/profile.module.css";

export default class ProfilePage extends React.Component {

  clientInfo: ClientInfo;

  constructor(props: {}) {
    super(props);

    this.clientInfo = new ClientInfo({ idb: new AppIDB() });
  }

  componentDidMount() {
    this.clientInfo.initialize();
  }

  render() {
    return(
      <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <Head>
          <title>Kiradopay - 名前の変更</title>
        </Head>
        <AppBar position="static">
          <Toolbar variant="dense">
            <Box component="h1" sx={{ flexGrow: 1 }} />
            <NoSsr>
              <Suspense fallback={ null }>
                <Typography>
                  <ClientName info={ this.clientInfo } />
                </Typography>
              </Suspense>
            </NoSsr>
            <IconButton color="inherit">
              <AccountCircleIcon />
            </IconButton>
          </Toolbar>
        </AppBar>
        <Container sx={{ flex: "auto", overflowY: "auto" , py: 2 }}>
          <Typography component="h2" sx={{ fontWeight: "bold", fontSize: "1.5em", my: 2 }}>名前の変更</Typography>
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "stretch" }}>
            <NoSsr>
              <Suspense fallback={ 
                <CircularProgress sx={{ alignSelf: "center" }} />
              }>
                <Form clientInfo={ this.clientInfo } />
              </Suspense>
            </NoSsr>
          </Box>
        </Container>
      </Box>
    )
  }
}

const Form: React.FC<{ clientInfo: ClientInfo }> = ({ clientInfo }) => (
  <form
    action={ `/api/clients/${ clientInfo.getOrThrow().id }/edit` }
    method="post"
    className={ styles.form }
  >
    <TextField name="name" defaultValue="" sx={{ my: 1 }}/>
    <Button type="submit" variant="contained" sx={{ my: 1 }}>送信</Button>
  </form>
);
