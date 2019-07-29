import Dependencies._

name := "spatialviz"
organization := "ics.uci.edu"

version := "1.0-SNAPSHOT"

//lazy val root = (project in file(".")).enablePlugins(PlayJava)
lazy val spatialviz = (project in file(".")).
  settings(
    libraryDependencies ++= spatialvizDependencies
  ).
  settings(
    mappings in Universal ++=
      (baseDirectory.value / "public" / "data" * "*" get) map
        (x => x -> ("public/data/" + x.getName))
  ).enablePlugins(PlayJava)

scalaVersion := "2.13.0"

libraryDependencies += guice
libraryDependencies ++= Seq( jdbc , ehcache , ws , specs2 % Test )
