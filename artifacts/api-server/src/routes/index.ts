import { Router, type IRouter } from "express";
import healthRouter from "./health";
import imagesRouter from "./images";
import imageMapRouter from "./image-map";

const router: IRouter = Router();

router.use(healthRouter);
router.use(imagesRouter);
router.use(imageMapRouter);

export default router;
