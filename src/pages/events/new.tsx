import React from "react";
import { Box, Typography } from "@mui/material";
import styles from "../../styles/form.module.css";
import Layout from "../../components/Layout";

export default class NewEventPage extends React.Component {
  render() {
    return(
      <Layout
        headTitle="Kiradopay - 新しいイベント"
        bodyTitle="Kiradopay"
        menuItems={[
          { href: "/", textContent: "トップ" },
          { href: "/profile", textContent: "名前の変更" },
        ]}
      >
        <Typography component="h2" sx={{ fontWeight: "bold", fontSize: "1.5em", my: 2 }}>新しいイベント</Typography>
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "stretch" }}>
          <form onSubmit={ this.submit } className={ styles.form } >
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

    } catch {
      window.alert("エラー発生");
      window.location.reload();
    }
  }
}
