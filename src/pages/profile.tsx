import React from "react";
import { Box, Button, CircularProgress, TextField, Typography } from "@mui/material";
import AppIDB from "../AppIDB";
import { ProfileLoader } from "../profile";
import styles from "../styles/profile.module.css";
import Layout from "../components/Layout";

export default class ProfilePage extends React.Component<{}, { submit: boolean }> {

  idb: AppIDB;
  profile: ProfileLoader;
  textField: React.RefObject<HTMLInputElement>;

  constructor(props: {}) {
    super(props);

    this.state = {
      submit: false,
    }

    this.idb = new AppIDB();
    this.profile = new ProfileLoader({ idb: this.idb });
    this.textField = React.createRef();
  }

  componentDidMount() {
    this.profile.initialize();
  }

  render() {
    return (
      <Layout
        headTitle="Kiradopay - 名前の変更"
        bodyTitle="Kiradopay"
        menuItems={[
          { href: "/", textContent: "トップ" },
        ]}
        profile={ this.profile }
      >
        <Typography component="h2" sx={{ fontWeight: "bold", fontSize: "1.5em", my: 2 }}>名前の変更</Typography>
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "stretch" }}>
          <form onSubmit={ this.submit } className={ styles.form } >
            <TextField name="name" defaultValue="" sx={{ my: 1 }} inputRef={ this.textField }/>
            <Button
              type="submit"
              variant="contained"
              disabled={ this.state.submit }
              sx={{ my: 1, height: "4em" }}
            >
              {
                this.state.submit ? <CircularProgress/> : "送信"
              }</Button>
          </form>
        </Box>
      </Layout>
    );
  }

  submit: React.FormEventHandler = async e => {
    e.preventDefault();
    this.setState({
      submit: true,
    });
    try {
      const id = (await this.profile.getAsync()).id;
      const name = this.textField.current!.value;
      const response = await fetch(`/api/clients/${ id }/edit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) {
        throw new Error;
      }
      (await this.idb.open()).put("info", { id, name }, "client");
      window.location.href = "/";
    } catch {
      window.alert("エラー発生");
      window.location.reload();
    }
  }
}
