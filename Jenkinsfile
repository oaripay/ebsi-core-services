node {
  stage('SCM') {
    checkout poll: false, scm: [$class: 'GitSCM', branches: [[name: 'dev']], doGenerateSubmoduleConfigurations: false, extensions: [], submoduleCfg: [], userRemoteConfigs: [[url: 'https://ebsi1-robot@ec.europa.eu/cefdigital/code/scm/ebsi/1-notarization-uc.git', credentialsId: 'b257a49a-5fed-4971-a6df-e05d3200edc0']]]
  }
  stage('SonarQube Analysis') {
        sh "/var/lib/jenkins/tools/hudson.plugins.sonar.SonarRunnerInstallation/sonar-scanner/bin/sonar-scanner -Dsonar.host.url=https://infra.ebsi.xyz/sonar -Dsonar.projectName=1-notarization-uc -Dsonar.projectVersion=1.0 -Dsonar.projectKey=1-notarization-uc -Dsonar.sources=. -Dsonar.projectBaseDir=/var/lib/jenkins/workspace/1-notarization-uc"
    }
  }
