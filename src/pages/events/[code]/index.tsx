import React from "react";
import { GetServerSideProps } from "next";
import { PrismaClient } from "@prisma/client";
import type { Event as EventObject, Item } from "@prisma/client";
import { Box, BoxProps, Card, CardContent, CardMedia, CircularProgress, Container, Grid, LinearProgress, Paper, Typography } from "@mui/material";
import Button, { ButtonProps } from "@mui/material/Button"
import {
  Cancel as CancelIcon,
  CloudDone as CloudDoneIcon,
  CloudOff as CloudOffIcon,
  CloudQueue as CloudQueueIcon,
  CloudUpload as CloudUploadIcon,
  HourglassBottom as HourglassBottomIcon,
} from "@mui/icons-material";
import chunk from "lodash.chunk";
import Layout from "../../../components/Layout";
import EventApplication, { DBState, WsState } from "../../../EventApplication";
import AppIDB from "../../../AppIDB";
import CalculatorInterface from "../../../CalculatorInterface";
import calculator from "../../../calculator";
import { ProfileLoader } from "../../../profile";

type EventPageProps = {
  event: EventObject & { items: Item[] }
};

type EventPageState = {
  numbers: Map<number, number>,
  clientName: string | null,
  status: StatusType,
  timerStartTime: number| null,
}

type StatusType = "dbInitializing" | "dbBlocked" | "wsInitializing" | "synced" | "registering" | "syncing" | "offline" | "error";

export const getServerSideProps: GetServerSideProps<EventPageProps> = async ({ params }) => {
  const prisma = new PrismaClient();
  const event = await prisma.event.findUnique({
    where: { code: params!.code as string },
    include: { items: true }
  })
  if (event) {
    return ({
      props: { event },
    });
  } else {
    return ({
      notFound: true,
    })
  }
};

export default class EventPage extends React.Component<EventPageProps, EventPageState> {

  application: EventApplication;
  calculator: CalculatorInterface;
  idb: AppIDB;
  profile: ProfileLoader;

  static status(dbState: DBState, wsState: WsState): StatusType {
    switch (dbState) {
      case "uninitialized":
      case "opening":
        return "dbInitializing";
      case "blocked":
        return "dbBlocked"
      case "registering":
        return "registering";
      case "open":
        switch(wsState) {
          case "uninitialized":
          case "connecting":
          case "hello":
            return "wsInitializing";
          case "online":
            return "synced";
          case "syncing":
            return "syncing";
          case "offline":
            return "offline";
        }
      case "error":
        return "error";
    }
  }

  constructor(props: EventPageProps) {
    super(props);

    this.state = {
      numbers: new Map(props.event.items.map(item => [item.id, 0])),
      clientName: null,
      status: "dbInitializing",
      timerStartTime: null,
    };

    this.idb = new AppIDB();
    this.profile = new ProfileLoader({ idb: this.idb });
    this.application = new EventApplication({
      eventId: this.props.event.id,
      idb: this.idb,
      profile: this.profile,
    });
    this.application.addEventListener("statechange", () => {
      this.setState({
        status: EventPage.status(
          this.application.dbState,
          this.application.wsState,
        )
      })
    });
    this.application.addEventListener("dberror", () => {
      window.alert("ブラウザのデータベース (IndexedDB) でエラーが発生しました。");
    });
    this.calculator = calculator({ event: props.event, items: props.event.items });
  }

  componentDidMount() {
    this.profile.initialize();
    this.application.initialize();
  }

  render() {
    const main = (
      <Grid container spacing={1} alignItems="stretch">
        {
          this.props.event.items.map(item => (
            <Grid item key={ item.id } xs={12} md={6} lg={4} xl={3}>
              <ItemComponent
                item={ item }
                number={ this.state.numbers.get(item.id)! }
                onNumberChange={ newValue => this.numberChanged(item.id, newValue) }
              />
            </Grid>
          ))
        }
      </Grid>
    );
    const bottom = (
      <>
        {
          this.state.status === "dbInitializing" || this.state.status === "dbBlocked"
          ? <LinearProgress />
          : null
        }
        <Paper variant="outlined" square sx={{ py: 1 }}>
          <Container>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Status value={ this.state.status } />
              <PriceComponent totalAmount={ this.totalAmount() } sx={{ flex: "auto", px: 2 }} />
              <Box sx={{ flex: "none", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <LargeButton
                  variant="contained"
                  disabled={
                    ["dbInitializing", "dbBlocked", "registering", "error"].includes(this.state.status)
                    || Array.from(this.state.numbers).map(([_, number]) => number).every(x => x === 0)
                  }
                  onClick={ this.registerButtonClicked }
                  sx={{ px: 4, my: 0.5 }}
                >
                  登録
                </LargeButton>
                <Box sx={{ fontSize: "0.75em", height: "1.25em" }}>
                  <Timer startTime={ this.state.timerStartTime }/>
                </Box>
              </Box>
            </Box>
          </Container>
        </Paper>
      </>
    );
    return (
      <Layout
        headTitle={ `${ this.props.event.name } - Kiradopay` }
        bodyTitle={ this.props.event.name }
        menuItems={[
          { href: "/", textContent: "トップ" },
          { href: "/profile", textContent: "名前の変更" },
          { href: `/events/${ this.props.event.code }/dashboard`, textContent: "このイベントのダッシュボード" },
        ]}
        profile={ this.profile }
        bottom={ bottom }
      >
        { main }
      </Layout>
    );
  }

  totalAmount(): number {
    return this.calculator.exec(this.state.numbers);
  }

  numberChanged = (id: number, newValue: number) => {
    this.setState(currentState => ({
      numbers: new Map(currentState.numbers).set(id, newValue)
    }));
  }

  registerButtonClicked = () => {
    this.setState({
      timerStartTime: null,
    })
    const items = (
      Array.from(this.state.numbers)
      .map(([itemId, number]) => ({ itemId, number }))
      .filter(({ number }) => number !== 0)
    );
    this.application.register({ items, totalAmount: this.totalAmount() }).then(() => {
      this.setState({
        numbers: new Map(this.props.event.items.map(item => [item.id, 0])),
        timerStartTime: Date.now(),
      });
    }).catch(() => {
      window.alert("ブラウザのデータベース (IndexedDB) でエラーが発生しました。データは保存できていない可能性が高いです。");
    });
  };
};

type ItemProps = {
  item: Item,
  number: number,
  onNumberChange: (newValue: number) => void,
};

const ItemComponent: React.FC<ItemProps> = ({ item, number, onNumberChange }) => (
  <Card sx={{ display: "flex", flexDirection: "row", height: "100%" }}>
    <CardMedia
      component="img"
      image={ item.img || "about:blank" }
      sx={{ flex: "1 1 0", width: "25%", alignSelf: "stretch", objectFit: "contain", background: "black" }}
    />
    <CardContent sx={{ flex: "3 1 0", alignSelf: "center", display: "flex", flexDirection: "column", gap: 1 }}>
      <Typography component="b" sx={{ fontWeight: "bold" }}>
        { item.name }
      </Typography>
      <ItemNumberInput value={ number } onValueChange={ onNumberChange } />
    </CardContent>
  </Card>
);

type ItemNumberInputProps = {
  value: number,
  onValueChange: (newValue: number) => void,
}

const ItemNumberInput = ({ value, onValueChange }: ItemNumberInputProps) => (
  <Box sx={{display: "flex", gap: 1}}>
    <ItemNumberInputButtonNumber
      sx={{ flex: "1 1 0" }}
      onClick={ () => onValueChange(0) }
      selected={ value === 0 }
    >
      0
    </ItemNumberInputButtonNumber>
    <ItemNumberInputButtonNumber
      sx={{ flex: "1 1 0" }}
      onClick={ () => onValueChange(1) }
      selected={ value === 1 }
    >
      1
    </ItemNumberInputButtonNumber>
    <ItemNumberInputButtonNumber
      sx={{ flex: "1 1 0" }}
      onClick={ () => onValueChange(2) }
      selected={ value === 2 }
    >
      2
    </ItemNumberInputButtonNumber>
    <ItemNumberInputButton sx={{ flex: "1 1 0" }}>+</ItemNumberInputButton>
  </Box>
);

const ItemNumberInputButtonNumber = ({ selected, ...props }: ButtonProps & { selected: boolean }) => (
  <ItemNumberInputButton variant={ selected ? "contained" : "outlined" } { ...props }/>
);

const ItemNumberInputButton = (props: ButtonProps) => (
  <LargeButton { ...props } sx={{ minWidth: 0, px: 0.5, ...props.sx }}/>
);

const Status: React.FC<{ value: StatusType }> = ({ value }) => {
  switch(value) {
    case "dbInitializing":
    case "dbBlocked":
      return <HourglassBottomIcon />;
    case "wsInitializing":
      return <CloudQueueIcon />;
    case "synced":
      return <CloudDoneIcon />;
    case "registering":
      return <CircularProgress />;
    case "syncing":
      return <CloudUploadIcon />;
    case "offline":
      return <CloudOffIcon />;
    case "error":
      return <CancelIcon />;
  }
};

const PriceComponent: React.FC<{ totalAmount: number } & BoxProps> = ({ totalAmount, sx, ...props }) => (
  <Box { ...props } sx={{ display: "flex", flexDirection: "column", ...sx }}>
    <Typography sx={{
      fontSize: "2em",
      fontWeight: "bold",
      textAlign: "right",
    }}>
      ¥ { totalAmount.toLocaleString("ja-JP") }
    </Typography>
    <Box sx={{ fontSize: "0.75em", textAlign: "right" }}>
      {
        chunk(calculateChanges(totalAmount), 2).map((a, i) => (
          <Box key={i} sx={{ display: "inline-block" }}>
            {
              a!.map((v, j) => (
                <Box key={j} sx={{
                  display: "inline-block",
                  width: "8em",
                  height: "1.125em",
                  mx: 1,
                }}>
                  <Box component="span" sx={{ display: "inline-block", width: "3.5em", textAlign: "right" }}>
                    { v != null &&  `¥ ${ v[0].toLocaleString("ja-JP") }`}
                  </Box>
                  <Box component="span" sx={{ display: "inline-block", width: "1em", textAlign: "center" }}>
                    { v != null && "→"}
                  </Box>
                  <Box component="span" sx={{ display: "inline-block", width: "3.5em", textAlign: "right" }}>
                    { v != null &&  `¥ ${ v[1].toLocaleString("ja-JP") }`}
                  </Box>
                </Box>
              ))
            }
          </Box>
        ))
      }
    </Box>
  </Box>
);

function calculateChanges(totalAmount: number): ([number, number] | null)[] {
  if (totalAmount === 0) {
    return [null, null, null, null];
  }
  return [500, 1000, 5000, 10000].map((x, i, a) => {
    const y = Math.ceil(totalAmount / x) * x;
    if (a[i + 1] && y % a[i + 1] === 0) {
      return null;
    } else {
      return [y, y - totalAmount];
    }
  });
}

class Timer extends React.Component<{ startTime: number | null }> {

  componentDidMount() {
    setInterval(() => {
      this.forceUpdate();
    })
  }

  render() {
    if (!this.props.startTime) {
      return "00:00";
    }
    const value = Math.floor((Date.now() - this.props.startTime) / 1000);
    const minutes = Math.floor(value / 60).toString().padStart(2, "0");
    const seconds = (value % 60).toString().padStart(2, "0");
    return `${ minutes }:${ seconds }`;
  }
}

const LargeButton = (props: ButtonProps) => (
  <Button
    variant="outlined"
    {...props}
    sx={{ fontSize: "1.5em", lineHeight: "normal", py: 1, ...props.sx }}
  />
);
