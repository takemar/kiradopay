import React from "react";
import { GetServerSideProps } from "next";
import { PrismaClient } from "@prisma/client";
import type { Event, Item, SalesRecord } from "@prisma/client";
import { AppBar, Box, Card, CardContent, CardMedia, CircularProgress, Container, Grid, IconButton, LinearProgress, Paper, Toolbar, Typography } from "@mui/material";
import Button, { ButtonProps } from "@mui/material/Button"
import {
  Cancel as CancelIcon,
  CloudDone as CloudDoneIcon,
  CloudOff as CloudOffIcon,
  CloudQueue as CloudQueueIcon,
  CloudUpload as CloudUploadIcon,
  HourglassBottom as HourglassBottomIcon,
  Menu as MenuIcon,
} from "@mui/icons-material";
import EventApplication, { DBState, WsState } from "../../EventApplication";

type EventPageProps = {
  event: Event & { items: Item[] }
};

type EventPageState = {
  numbers: Map<number, number>,
  status: StatusType,
}

type StatusType = "dbInitializing" | "wsInitializing" | "synced" | "registering" | "syncing" | "offline" | "error";

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

  static status(dbState: DBState, wsState: WsState): StatusType {
    switch (dbState) {
      case "uninitialized":
      case "opening":
        return "dbInitializing";
      case "registering":
        return "registering";
      case "open":
        switch(wsState) {
          case "uninitialized":
          case "connecting":
          case "loading":
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
      status: "dbInitializing",
    };

    this.application = new EventApplication(this.props.event.id);
    this.application.addEventListener("statechange", () => {
      this.setState({
        status: EventPage.status(
          this.application.dbState,
          this.application.wsState,
        )
      })
    })
  }

  componentDidMount() {
    this.application.initialize();
  }

  render() {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <AppBar position="static">
          <Toolbar variant="dense">
            <Typography component="h1" sx={{ flexGrow: 1 }}>
              { this.props.event.name }
            </Typography>
            <IconButton aria-label="menu" color="inherit">
              <MenuIcon />
            </IconButton>
          </Toolbar>
        </AppBar>
        <Container sx={{ flex: "auto", overflowY: "auto" , py: 2 }}>
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
        </Container>
        {
          this.state.status === "dbInitializing"
          ? <LinearProgress />
          : null
        }
        <Paper variant="outlined" square sx={{ py: 1 }}>
          <Container>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Status value={ this.state.status } />
              <Typography sx={{
                flex: "auto",
                fontSize: "2em",
                fontWeight: "bold",
                textAlign: "right",
                px: 2
              }}>
                &yen; { this.totalAmount().toLocaleString("ja-JP") }
              </Typography>
              <LargeButton
                variant="contained"
                disabled={
                  ["dbInitializing", "registering", "error"].includes(this.state.status)
                  || Array.from(this.state.numbers).map(([_, number]) => number).every(x => x === 0)
                }
                onClick={ this.registerButtonClicked }
                sx={{ px: 4 }}
              >
                登録
              </LargeButton>
            </Box>
          </Container>
        </Paper>
      </Box>
    );
  }

  totalAmount(): number {
    return (
      this.props.event.items
      .map(item => item.unitPrice * this.state.numbers.get(item.id)!)
      .reduce((a, b) => a + b)
    );
  }

  numberChanged = (id: number, newValue: number) => {
    this.setState(currentState => ({
      numbers: new Map(currentState.numbers).set(id, newValue)
    }));
  }

  registerButtonClicked = () => {
    const items = (
      Array.from(this.state.numbers)
      .map(([itemId, number]) => ({ itemId, number }))
      .filter(({ number }) => number !== 0)
    );
    this.application.register(items).then(() => {
      this.setState({
        numbers: new Map(this.props.event.items.map(item => [item.id, 0]))
      });
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
      sx={{ flex: "1 1 0", alignSelf: "stretch", objectFit: "contain", background: "black" }}
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

const LargeButton = (props: ButtonProps) => (
  <Button
    variant="outlined"
    {...props}
    sx={{ fontSize: "1.5em", lineHeight: "normal", py: 1, ...props.sx }}
  />
);

function randomUUID() {
  if (!("randomUUID" in crypto)) {
    crypto.randomUUID = function randomUUID() {
      const randomValues = crypto.getRandomValues(new Uint16Array(8));
      randomValues[3] = (randomValues[3] & 0x0fff) | 0x4000;
      randomValues[4] = (randomValues[4] & 0x3fff) | 0x8000;
      const hex = Array.from(randomValues).map(x => x.toString(16))
      return `${ hex[0] }${ hex[1] }-${ hex[2] }-${ hex[3] }-${ hex[4] }-${ hex[5] }${ hex[6] }${ hex[7] }`;
    }
  }
  return crypto.randomUUID!();
}
