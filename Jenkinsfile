node {
  stage('SCM') {
    checkout poll: false, scm: [$class: 'GitSCM', branches: [[name: 'feature/notary-dapp']], doGenerateSubmoduleConfigurations: false, extensions: [], submoduleCfg: [], userRemoteConfigs: [[url: 'https://n002tbs0@ec.europa.eu/cefdigital/code/scm/ebsi/1-notarization-uc.git', credentialsId: 'EBSI_Jara']]]
  }
  stage('SonarQube Analysis') {
        sh "/var/lib/jenkins/tools/hudson.plugins.sonar.SonarRunnerInstallation/sonar-scanner/bin/sonar-scanner -Dsonar.host.url=https://infra.ebsi.xyz/sonar -Dsonar.projectName=1-notarization-uc -Dsonar.projectVersion=1.0 -Dsonar.projectKey=1-notarization-uc -Dsonar.sources=. -Dsonar.projectBaseDir=/var/lib/jenkins/workspace/1-notarization-uc"
    }
  }
